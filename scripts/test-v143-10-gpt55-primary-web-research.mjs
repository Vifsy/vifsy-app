import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

function extractFunction(name, nextName) {
  const start = route.indexOf(`function ${name}`);
  const end = route.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `Could not extract ${name}`);
  return route.slice(start, end);
}

assert.match(
  route,
  /const CAMPAIGN_PRIMARY_WEB_RESEARCH_TARGET = 10;/
);
assert.match(
  route,
  /const CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED = 5;/
);
assert.match(
  route,
  /const PRODUCT_RESEARCH_MODEL = process\.env\.PRODUCT_RESEARCH_MODEL \|\| "gpt-5\.5";/
);

const primaryResearchFunction = extractFunction(
  "findPrimaryCampaignProductsWithWebSearch",
  "finalizeCarouselFromPrimaryCampaignWebResearch"
);
assert.match(
  primaryResearchFunction,
  /Hitta \$\{CAMPAIGN_PRIMARY_WEB_RESEARCH_TARGET\} passande produkter från \$\{allowedDomain\} för \$\{campaignTheme\}/,
  "The primary task must retain the same concise human-style request"
);
assert.match(primaryResearchFunction, /model: PRODUCT_RESEARCH_MODEL/);
assert.match(primaryResearchFunction, /type: "web_search"/);
assert.match(
  primaryResearchFunction,
  /filters:\s*\{\s*allowed_domains: \[allowedDomain\]/
);
assert.match(primaryResearchFunction, /search_context_size: "high"/);
assert.match(primaryResearchFunction, /tool_choice: "required"/);
assert.match(primaryResearchFunction, /type: "json_schema"/);
assert.match(
  primaryResearchFunction,
  /verifyDiscoveredWebsiteProductCandidates/
);
assert.doesNotMatch(
  primaryResearchFunction,
  /applyAiCampaignFitScores|selectCampaignCarouselProductsWithSeniorFinalReview/,
  "GPT-5.5's ranked result must not be sent through a second score gate"
);

const finalizerFunction = extractFunction(
  "finalizeCarouselFromPrimaryCampaignWebResearch",
  "findProductUrlWithWebSearch"
);
assert.match(
  finalizerFunction,
  /validProducts\.length <\s*CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED/
);
assert.match(
  finalizerFunction,
  /selectedProducts = rankedProducts\.slice\(\s*0,\s*CAROUSEL_PRODUCT_SLIDE_TARGET/
);
assert.match(
  finalizerFunction,
  /legacy_180_candidate_flow_skipped: true/
);
assert.doesNotMatch(
  finalizerFunction,
  /selectCampaignCarouselProductsWithSeniorFinalReview/,
  "The primary GPT-5.5 selection already is the senior semantic review"
);

const preparationStart = route.indexOf(
  "async function prepareCarouselProductsForRule"
);
const preparationEnd = route.indexOf(
  "function getPostDestinationUrl",
  preparationStart
);
const preparation = route.slice(preparationStart, preparationEnd);
const primaryCallIndex = preparation.indexOf(
  "findPrimaryCampaignProductsWithWebSearch"
);
const vocabularyIndex = preparation.indexOf(
  "ensureProductSearchQueriesForRule"
);
const persistent180Index = preparation.indexOf(
  "loadWebsiteProductCandidateQueue"
);
assert.ok(primaryCallIndex >= 0);
assert.ok(vocabularyIndex > primaryCallIndex);
assert.ok(
  persistent180Index > primaryCallIndex,
  "Primary GPT-5.5 domain research must run before the 180-candidate queue"
);
assert.match(
  preparation,
  /if \(primaryWebResearchResult\) \{\s*return primaryWebResearchResult;/
);
assert.match(
  preparation,
  /continuing with the unchanged v143\.8 fallback flow/
);

const signalFunction = extractFunction(
  "getCampaignProductSignalState",
  "normalizeCampaignFitScore"
);
assert.match(
  signalFunction,
  /hasTrustedPrimaryWebResearchSignal/
);
assert.match(
  route,
  /campaign_primary_web_researched:\s*candidate\?\.campaign_primary_web_researched === true/
);
assert.match(
  route,
  /campaign_primary_web_researched:\s*row\?\.metadata\?\.campaign_primary_web_researched === true/
);

console.log(
  "v143.10 GPT-5.5 primary domain web-research tests passed."
);
