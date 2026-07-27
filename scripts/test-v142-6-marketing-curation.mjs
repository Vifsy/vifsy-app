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
const strategyCall = route.indexOf(
  "generateCampaignCarouselMarketingStrategy({",
  prepareStart
);
const vocabularyCall = route.indexOf(
  "ensureProductSearchQueriesForRule({",
  prepareStart
);
assert.ok(
  prepareStart >= 0 && strategyCall > prepareStart && vocabularyCall > strategyCall,
  "Senior strategy must be prepared before fast-model vocabulary/research"
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
assert.match(finalBlock, /Do not silently fill an uncovered strategy slot/);
assert.match(finalBlock, /"publishable": true/);
assert.match(finalBlock, /"missing_needs"/);
assert.match(finalBlock, /rejectedProducts:/);
assert.doesNotMatch(
  finalBlock,
  /for \(const evaluation of eligibleEvaluations\)[\s\S]{0,200}addIndex/,
  "Senior-selected indices must not be silently backfilled by standalone score"
);

assert.match(route, /async function runCampaignCurationTargetedRescue/);
assert.match(
  route,
  /\(!finalReview\.publishable \|\|[\s\S]{0,200}hasProductPreparationBudget\(75_000\)/
);
assert.match(route, /reviewPass: "targeted_rescue"/);
assert.match(route, /campaign_curation_targeted_rescue/);
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
