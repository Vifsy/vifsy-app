import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.match(route, /function normalizeCampaignThemeContract/);
assert.match(route, /function enforceCampaignThemeBoundQueries/);
assert.match(route, /primary_theme/);
assert.match(route, /approved_theme_terms/);
assert.match(route, /secondary_context/);
assert.match(
  route,
  /Read the complete campaign name and context semantically/
);
assert.match(
  route,
  /Never depend on a dash, colon, word order or another title delimiter/
);
assert.match(
  route,
  /Put concrete local-language theme plus product\/category searches first/
);
assert.match(
  route,
  /contextually suitable product\/category searches from the supplied senior strategy/
);
assert.match(
  route,
  /getCampaignCoreTitleSegment[\s\S]{0,500}complete title is retained/
);

assert.match(
  route,
  /WEBSITE_STORE_SEARCH_CANDIDATE_POOL_LIMIT[\s\S]{0,120}120/
);
assert.match(route, /CAMPAIGN_LOCKED_SEARCH_POOL_MIN_ITEMS = 15/);
assert.match(
  route,
  /CAMPAIGN_PRELIMINARY_TEXT_EVIDENCE_POOL_ITEMS = 20/
);
assert.match(route, /function extractStoreSearchPaginationUrls/);
assert.match(route, /function selectStoreSearchUrlsForFetch/);
assert.match(route, /queueNextSearchAlternative/);
assert.match(route, /campaign_text_evidence_count/);
assert.match(
  route,
  /selectBalancedStoreSearchCandidates\([\s\S]{0,900}excludeUsed/
);
assert.doesNotMatch(
  route,
  /Array\.from\(groupedByQuery\.values\(\)\)\s*\.slice\(0,\s*Math\.min\(6/
);

assert.match(route, /CAMPAIGN_VOCABULARY_TIMEOUT_MS/);
assert.match(route, /CAMPAIGN_FAST_REVIEW_TIMEOUT_MS/);
assert.match(
  route,
  /CAROUSEL_PREPARATION_SOFT_DEADLINE_MS[\s\S]{0,220}210_000/
);
assert.match(
  route,
  /\{ timeout: CAMPAIGN_VOCABULARY_TIMEOUT_MS \}/
);
assert.match(
  route,
  /\{ timeout: CAMPAIGN_FAST_REVIEW_TIMEOUT_MS \}/
);
assert.match(
  route,
  /Campaign store-search fast review timed out or failed; continuing with direct text evidence/
);

const signalStart = route.indexOf("function getCampaignProductSignalState");
const signalEnd = route.indexOf(
  "function normalizeCampaignFitScore",
  signalStart
);
const signalBlock = route.slice(signalStart, signalEnd);
assert.doesNotMatch(
  signalBlock,
  /themeMatches > 0 \|\| hasTrustedStoreSearchSignal/
);
assert.match(
  signalBlock,
  /hasMeaningfulCampaignSignal: relevance\.meaningful/
);
assert.match(signalBlock, /contextualCampaignApproval/);

const titleEvidenceStart = route.indexOf(
  "function countCampaignTitleThemeEvidence"
);
const titleEvidenceEnd = route.indexOf(
  "function buildCampaignFinalReviewShortlist",
  titleEvidenceStart
);
const titleEvidenceBlock = route.slice(
  titleEvidenceStart,
  titleEvidenceEnd
);
assert.doesNotMatch(titleEvidenceBlock, /getCampaignStoreSearchQuery/);
assert.match(route, /item\?\.category/);
assert.match(route, /Array\.isArray\(item\?\.tags\)/);

const finalStart = route.indexOf(
  "async function selectCampaignCarouselProductsWithSeniorFinalReview"
);
const finalEnd = route.indexOf(
  "function buildCampaignCurationRescueRule",
  finalStart
);
const finalBlock = route.slice(finalStart, finalEnd);
assert.match(finalBlock, /blockingMissingNeeds/);
assert.match(finalBlock, /hasMissingRequiredCoverage/);
assert.match(route, /function buildBoundedCampaignFinalReviewFallback/);
assert.match(
  finalBlock,
  /using bounded direct text-evidence fallback/
);
assert.doesNotMatch(
  finalBlock,
  /missingNeeds\.length === 0/
);
assert.doesNotMatch(
  route,
  /selectedProducts = selectedProducts\.slice\(\s*0,\s*CAROUSEL_PRODUCT_SLIDE_TARGET - 1/
);

console.log("v142.9 semantic theme and evidence tests passed.");
