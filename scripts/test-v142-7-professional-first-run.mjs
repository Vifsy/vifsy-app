import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.match(route, /export const maxDuration = 600/);
assert.match(
  route,
  /CAROUSEL_PREPARATION_SOFT_DEADLINE_MS[\s\S]{0,180}420_000/
);
assert.match(route, /CAMPAIGN_STORE_SEARCH_QUERY_LIMIT = 20/);
assert.match(route, /CAMPAIGN_FINAL_REVIEW_SHORTLIST_LIMIT = 30/);
assert.match(route, /CAMPAIGN_CURATION_RESCUE_VERIFY_LIMIT = 40/);
assert.match(
  route,
  /async function findCampaignStrategySlotCandidatesWithWebSearch/
);
assert.match(
  route,
  /Search separately for every requested slot[\s\S]{0,1500}Do not reuse the same product for two slots/
);
assert.match(
  route,
  /researchModel: PRODUCT_RESEARCH_MODEL,[\s\S]{0,120}attempt: "initial_strategy_slots"/
);
assert.match(route, /roundRobinCampaignStrategyCandidates/);
assert.match(route, /hasCompleteCampaignStrategyCandidateCoverage/);
assert.match(route, /campaign_strategy_slot_id/);
assert.match(route, /campaign_strategy_required_evidence/);

const earlyExitCall = route.indexOf(
  "await finalizeCarouselFromStoreMapEarlyExit"
);
const campaignGuard = route.lastIndexOf("if (!isCampaignRule)", earlyExitCall);
assert.ok(
  campaignGuard >= 0 && earlyExitCall > campaignGuard,
  "Store Map early exit must be restricted to non-campaign carousels"
);
assert.match(
  route,
  /Store Map campaign pool forwarded to mandatory senior curation/
);

const shortlistStart = route.indexOf(
  "function buildCampaignFinalReviewShortlist"
);
const shortlistEnd = route.indexOf(
  "function formatCampaignFinalReviewCandidates",
  shortlistStart
);
const shortlistBlock = route.slice(shortlistStart, shortlistEnd);
assert.match(shortlistBlock, /isGenericVoucherCarouselCandidate/);
assert.match(shortlistBlock, /getCampaignStrategySlotId/);
assert.match(
  route,
  /Every selected product must use a different verified product page and a different verified product image/
);
assert.match(route, /missingSelectedSlotIds/);
assert.match(route, /hasUniqueSelectedImages/);
assert.match(route, /finalMissingNeeds/);

const rescueStart = route.indexOf(
  "async function runCampaignCurationTargetedRescue"
);
const rescueEnd = route.indexOf(
  "function scoreCampaignFitForRule",
  rescueStart
);
const rescueBlock = route.slice(rescueStart, rescueEnd);
const rescueWebSearch = rescueBlock.indexOf(
  "findCampaignStrategySlotCandidatesWithWebSearch"
);
const rescueStoreSearch = rescueBlock.indexOf(
  "discoverProductCandidatesFromStoreSearch"
);
assert.ok(
  rescueWebSearch >= 0 && rescueStoreSearch > rescueWebSearch,
  "Targeted rescue must use slot-specific domain research before retailer search"
);
assert.match(rescueBlock, /researchModel: PRODUCT_RESEARCH_MODEL/);
assert.match(rescueBlock, /aiScore !== null && aiScore >= 45/);
assert.match(
  route,
  /skipped repeat senior review because rescue added no eligible shortlist products/
);

const slotResearchStart = route.indexOf(
  "async function findCampaignStrategySlotCandidatesWithWebSearch"
);
const genericResearchStart = route.indexOf(
  "async function findProductUrlWithWebSearch",
  slotResearchStart
);
const slotResearchBlock = route.slice(slotResearchStart, genericResearchStart);
assert.doesNotMatch(
  slotResearchBlock,
  /boozt|zalando|pressit/i,
  "Professional slot research must remain company-neutral"
);

console.log(
  "v142.7 professional first-run campaign research invariants passed."
);
