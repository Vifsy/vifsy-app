import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.match(route, /CAMPAIGN_FINAL_REVIEW_SHORTLIST_LIMIT = 20/);
assert.match(route, /CAMPAIGN_CURATION_RESCUE_VERIFY_LIMIT = 24/);
assert.match(
  route,
  /async function generateCampaignCarouselMarketingStrategy/
);
assert.match(
  route,
  /model: PRODUCT_RESEARCH_MODEL,[\s\S]{0,5000}Never use a predefined retailer template/
);
assert.match(
  route,
  /design exactly \$\{CAMPAIGN_MARKETING_STRATEGY_SLOT_COUNT\} dynamic selection slots/i
);
assert.match(route, /campaign_marketing_strategy: normalized/);
assert.match(
  route,
  /formatCampaignMarketingStrategyForPrompt\(\s*rule\?\.campaign_marketing_strategy/
);

const prepareStart = route.indexOf("async function prepareCarouselProductsForRule");
const prepareEnd = route.indexOf(
  "async function createAutomationRunLog",
  prepareStart
);
const prepareBlock = route.slice(prepareStart, prepareEnd);
const vocabularyCall = route.indexOf(
  "ensureProductSearchQueriesForRule({",
  prepareStart
);
assert.ok(
  prepareStart >= 0 && vocabularyCall > prepareStart,
  "Fast-model vocabulary must be prepared before product research"
);
assert.doesNotMatch(
  prepareBlock,
  /generateCampaignCarouselMarketingStrategy\(\{/,
  "Product discovery must not wait for an upfront senior strategy"
);

const finalStart = route.indexOf(
  "async function selectCampaignCarouselProductsWithSeniorFinalReview"
);
const rescueStart = route.indexOf(
  "function buildCampaignCurationRescueRule",
  finalStart
);
const finalBlock = route.slice(finalStart, rescueStart);

assert.match(finalBlock, /Judge the carousel as one commercial story/);
assert.match(
  finalBlock,
  /Do not reject a reasonable thematic product merely because it lacks a formal strategy slot/
);
assert.match(finalBlock, /"publishable": true/);
assert.match(finalBlock, /"missing_needs"/);
assert.match(finalBlock, /rejectedProducts:/);
assert.doesNotMatch(
  finalBlock,
  /parsed\?\.publishable === true[\s\S]{0,300}for \(const evaluation of eligibleEvaluations\)/,
  "Theme-fitting products must not be discarded because a JSON publishable flag was omitted"
);

assert.match(route, /async function runCampaignCurationTargetedRescue/);
assert.match(route, /campaign_curation_targeted_rescue/);
assert.doesNotMatch(prepareBlock, /runCampaignCurationTargetedRescue\(\{/);
assert.doesNotMatch(prepareBlock, /reviewPass: "targeted_rescue"/);
assert.match(route, /researchModel: PRODUCT_RESEARCH_FAST_MODEL/);
assert.match(
  route,
  /model: researchModel,[\s\S]{0,100}tools: \[\{ type: "web_search" \}\]/
);

const strategyRegion = route.slice(
  route.indexOf("function normalizeCampaignStrategyText"),
  route.indexOf("function buildFallbackProductSearchQueriesForRule")
);
assert.doesNotMatch(
  strategyRegion,
  /boozt|zalando|pressit/i,
  "The marketing strategy must remain company-neutral"
);

console.log("v142.6 dynamic marketing strategy and curation tests passed.");
