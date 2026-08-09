import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

assert.match(route, /const CAMPAIGN_PRIMARY_WEB_RESEARCH_TARGET = 10;/);
assert.match(route, /const CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED = 6;/);
assert.match(route, /const CAMPAIGN_PRIMARY_WEB_RESEARCH_MAX_ROUNDS = 2;/);
assert.match(route, /const CAROUSEL_PRODUCT_SLIDE_TARGET = 5;/);

const preparationStart = route.indexOf("async function prepareCarouselProductsForRule");
const preparationEnd = route.indexOf("function getPostDestinationUrl", preparationStart);
assert.ok(preparationStart >= 0 && preparationEnd > preparationStart);
const preparation = route.slice(preparationStart, preparationEnd);

assert.match(
  preparation,
  /researchRound <= CAMPAIGN_PRIMARY_WEB_RESEARCH_MAX_ROUNDS/,
  "campaign research must stay bounded to the configured max rounds"
);
assert.match(
  preparation,
  /combined(?:Hydrated|FinalVerified)Products\.length >=\s*CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED/,
  "the first round must not stop before six verified products"
);
assert.match(
  preparation,
  /Campaign primary GPT-5\.5 web research continuing (?:to reserve round|after final identity gate)/,
  "an insufficient first round should explicitly continue to the reserve round"
);
assert.match(
  preparation,
  /blockedWebsiteItems: combinedCandidates/,
  "the second round must exclude products already returned by earlier rounds"
);
assert.match(
  preparation,
  /requires \${CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED\} (?:verified|final verified) products \(\${CAROUSEL_PRODUCT_SLIDE_TARGET\} carousel products \+ at least 1 reserve\)/,
  "failure should explain the 5+1 fail-closed contract"
);

const finalizerStart = route.indexOf("async function finalizeCarouselFromPrimaryCampaignWebResearch");
const finalizerEnd = route.indexOf("function findProductUrlWithWebSearch", finalizerStart);
assert.ok(finalizerStart >= 0 && finalizerEnd > finalizerStart);
const finalizer = route.slice(finalizerStart, finalizerEnd);

assert.match(
  finalizer,
  /validProducts\.length <\s*CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED/,
  "finalization must require all six verified products"
);
assert.match(
  finalizer,
  /reserveProducts\.length < 1/,
  "finalization must fail closed when there is no verified reserve"
);
assert.match(
  finalizer,
  /selectedProducts\.length < CAROUSEL_PRODUCT_SLIDE_TARGET/,
  "five selected carousel products are still mandatory"
);

console.log("v143.62 verified reserve round regression tests passed.");
