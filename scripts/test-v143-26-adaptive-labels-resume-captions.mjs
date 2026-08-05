import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

function extractBetween(startText, endText) {
  const start = route.indexOf(startText);
  const end = route.indexOf(endText, start + startText.length);
  assert.ok(start >= 0 && end > start, `Could not extract ${startText}`);
  return route.slice(start, end);
}

const placementAnalysis = extractBetween(
  "async function analyzeCarouselProductLabelPlacements",
  "function boxesOverlapWithPadding"
);
assert.match(placementAnalysis, /openai\.responses\.create/);
assert.match(placementAnalysis, /slice\(0, CAROUSEL_PRODUCT_SLIDE_TARGET\)/);
assert.match(placementAnalysis, /timeout: 45_000, maxRetries: 0/);
assert.match(placementAnalysis, /text_only/);
assert.match(placementAnalysis, /compact_card/);
assert.match(placementAnalysis, /People and animals are allowed/);
assert.match(placementAnalysis, /return new Map\(\)/);

const renderer = extractBetween(
  "async function renderCarouselProductSlideImage",
  "function getDateYYYYMMDDInTimeZone"
);
assert.match(renderer, /fit: "contain"/);
assert.match(renderer, /productLabelAnalysis/);
assert.match(renderer, /productLabelApplied/);
assert.match(renderer, /safe corner and never changes the source image's size or crop/);
const labelRenderer = extractBetween(
  "function buildCarouselProductLabelSvg",
  "async function renderCarouselProductSlideImage"
);
assert.match(labelRenderer, /boxesOverlapWithPadding/);
assert.match(labelRenderer, /layoutProductTitle/);

const saveSlides = extractBetween(
  "async function saveCarouselSlidesForPost",
  "function websiteTextContainsAny"
);
assert.equal(
  (saveSlides.match(/analyzeCarouselProductLabelPlacements\(/g) || []).length,
  1,
  "All product images must be analyzed in one bounded call"
);
assert.ok(
  saveSlides.indexOf("analyzeCarouselProductLabelPlacements") <
    saveSlides.indexOf("mapWithConcurrency"),
  "Placement analysis must happen once before parallel rendering"
);
assert.match(saveSlides, /product_label_applied/);

const research = extractBetween(
  "async function findPrimaryCampaignProductsWithWebSearch",
  "function getCampaignRoleTokens"
);
assert.doesNotMatch(research, /without any person, human body part or animal/);
assert.match(research, /People, human body parts and animals are allowed/);
assert.match(research, /web research requested/);

const durable = extractBetween(
  "async function getDurableCampaignResearchResponse",
  "async function findPrimaryCampaignProductsWithWebSearch"
);
assert.match(durable, /resuming existing background response/);
assert.match(durable, /started new background response/);
assert.match(durable, /occurrenceId/);
assert.match(durable, /openaiResponseId/);
assert.match(durable, /pollCount/);
assert.match(durable, /Idempotency-Key/);

const preparationCatch = extractBetween(
  "const isBackgroundPending = error?.code",
  "} else if (isCampaignRule)"
);
assert.match(preparationCatch, /console\.info/);
assert.match(preparationCatch, /same background response will resume automatically/);

const instagramBuilder = extractBetween(
  "function buildInstagramCaptionFromPostContent",
  "function buildPlatformApprovalPreviews"
);
const buildInstagramCaptionFromPostContent = new Function(
  `${instagramBuilder}; return buildInstagramCaptionFromPostContent;`
)();
const instagramCaption = buildInstagramCaptionFromPostContent("Redo för skolstarten\nMer text");
assert.equal(instagramCaption.startsWith("\u2063\nRedo för skolstarten"), true);
assert.ok(instagramCaption.length <= 2200);
assert.equal(buildInstagramCaptionFromPostContent("   "), "");
assert.match(route, /publishCarouselPostToFacebook\([\s\S]*?caption: post\.content/);
assert.match(
  route,
  /publishCarouselPostToInstagram\([\s\S]*?caption: buildInstagramCaptionFromPostContent\(post\.content\)/
);

assert.match(route, /technicalPageStatus === 404/);
assert.doesNotMatch(route, /horze\.se|zalando\.se|isover\.(?:se|com)/i);

console.log("v143.26 adaptive labels, durable resume logging and Instagram caption checks passed.");
