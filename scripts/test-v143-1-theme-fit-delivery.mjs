import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluateSimpleCampaignThemeFit,
  selectThemeFittingProducts,
} from "../lib/campaignThemeFit.js";

const pressitLikeCandidates = [
  { title: "Julmotiv T-shirt", fitsTheme: true, verdict: "fits", score: 96, directThemeEvidence: true },
  { title: "Tomtetröja barn", fitsTheme: true, verdict: "fits", score: 92, directThemeEvidence: true },
  { title: "Vintermugg familj", fitsTheme: true, verdict: "fits", score: 78 },
  { title: "Personlig familjehoodie", fitsTheme: true, verdict: "fits", score: 73 },
  { title: "Röd festlig T-shirt", fitsTheme: true, verdict: "fits", score: 68 },
  { title: "Sommarlinnet", fitsTheme: false, verdict: "does_not_fit", score: 88 },
  { title: "Digitalt presentkort", fitsTheme: false, verdict: "does_not_fit", score: 90 },
  { title: "Unrelated 1", fitsTheme: false, verdict: "does_not_fit", score: 10 },
  { title: "Unrelated 2", fitsTheme: false, verdict: "does_not_fit", score: 10 },
  { title: "Unrelated 3", fitsTheme: false, verdict: "does_not_fit", score: 10 },
  { title: "Unrelated 4", fitsTheme: false, verdict: "does_not_fit", score: 10 },
  { title: "Unrelated 5", fitsTheme: false, verdict: "does_not_fit", score: 10 },
];

const selected = selectThemeFittingProducts(pressitLikeCandidates, 5);
assert.equal(selected.length, 5);
assert.ok(selected.every((item) => item.themeFit.approved));
assert.ok(!selected.some((item) => item.title === "Digitalt presentkort"));
assert.ok(!selected.some((item) => item.title === "Sommarlinnet"));

assert.equal(
  evaluateSimpleCampaignThemeFit({
    fitsTheme: true,
    verdict: "fits",
    score: 40,
  }).approved,
  true,
  "An explicit theme-fit decision must not be overturned by an arbitrary score threshold"
);
assert.equal(
  evaluateSimpleCampaignThemeFit({
    fitsTheme: false,
    verdict: "does_not_fit",
    score: 99,
  }).approved,
  false,
  "An explicitly unrelated product must not pass merely because of a numeric score"
);

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);
const prepareStart = route.indexOf("async function prepareCarouselProductsForRule");
const prepareEnd = route.indexOf("async function createAutomationRunLog", prepareStart);
const prepareBlock = route.slice(prepareStart, prepareEnd);
const signalStart = route.indexOf("function getCampaignProductSignalState");
const signalEnd = route.indexOf("function normalizeCampaignFitScore", signalStart);
const signalBlock = route.slice(signalStart, signalEnd);

assert.doesNotMatch(
  prepareBlock,
  /generateCampaignCarouselMarketingStrategy\(\{/,
  "A slow senior strategy must not consume the discovery budget before product search"
);
assert.match(route, /\{ timeout: CAMPAIGN_VOCABULARY_TIMEOUT_MS, maxRetries: 0 \}/);
assert.match(route, /\{ timeout: CAMPAIGN_FAST_REVIEW_TIMEOUT_MS, maxRetries: 0 \}/);
assert.match(route, /\{ timeout: CAMPAIGN_FINAL_REVIEW_TIMEOUT_MS, maxRetries: 0 \}/);
assert.match(route, /\{ timeout: 40_000, maxRetries: 0 \}/);
assert.match(route, /"fits_theme": true/);
assert.match(route, /"verdict": "fits \| does_not_fit"/);
assert.match(signalBlock, /isCampaignThemeFitApproved\(item\)/);
assert.doesNotMatch(signalBlock, /contextualMinimumScore/);
assert.match(route, /recoveredFromFastThemeFit/);
assert.match(route, /Campaign product preparation budget checkpoint/);
assert.doesNotMatch(route, /Campaign product preparation completed within bounded budget/);
assert.doesNotMatch(
  route,
  /passed the mandatory senior marketing curation and final relevance review at score/
);

console.log("v143.1 theme-fit delivery and timeout regression tests passed.");
