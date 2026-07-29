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

assert.match(route, /const CAMPAIGN_PRIMARY_WEB_RESEARCH_TARGET = 10;/);
assert.match(route, /const CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED = 5;/);
assert.match(route, /const CAMPAIGN_PRIMARY_WEB_RESEARCH_MAX_ROUNDS = 2;/);
assert.match(
  route,
  /const PRODUCT_RESEARCH_MODEL = process\.env\.PRODUCT_RESEARCH_MODEL \|\| "gpt-5\.5";/
);

const hydrationFunction = extractFunction(
  "hydrateAuthoritativeWebAgentProduct",
  "findPrimaryCampaignProductsWithWebSearch"
);
assert.match(hydrationFunction, /extractBestProductImageFromHtml/);
assert.match(hydrationFunction, /product_page_verified: false/);
assert.match(hydrationFunction, /authoritative_web_agent_selected: true/);
assert.doesNotMatch(
  hydrationFunction,
  /verifyDiscoveredWebsiteProductCandidates|classifyCommercePage|scoreCampaignFitForRule/,
  "Hydration may obtain technical assets but may not semantically judge GPT-5.5's products"
);

const primaryResearchFunction = extractFunction(
  "findPrimaryCampaignProductsWithWebSearch",
  "finalizeCarouselFromPrimaryCampaignWebResearch"
);
assert.match(
  primaryResearchFunction,
  /Hitta \$\{CAMPAIGN_PRIMARY_WEB_RESEARCH_TARGET\} passande produkter från \$\{allowedDomain\} för \$\{campaignTheme\}/
);
assert.match(primaryResearchFunction, /input: exactTask/);
assert.match(primaryResearchFunction, /model: PRODUCT_RESEARCH_MODEL/);
assert.match(primaryResearchFunction, /type: "web_search"/);
assert.match(
  primaryResearchFunction,
  /filters:\s*\{\s*allowed_domains: \[allowedDomain\]/
);
assert.match(primaryResearchFunction, /search_context_size: "high"/);
assert.match(primaryResearchFunction, /tool_choice: "required"/);
assert.match(primaryResearchFunction, /type: "json_schema"/);
assert.match(primaryResearchFunction, /minItems: CAMPAIGN_PRIMARY_WEB_RESEARCH_TARGET/);
assert.match(primaryResearchFunction, /hydrateAuthoritativeWebAgentProduct/);
assert.doesNotMatch(
  primaryResearchFunction,
  /verifyDiscoveredWebsiteProductCandidates|upsertWebsiteProductCandidateQueue|applyAiCampaignFitScores|selectCampaignCarouselProductsWithSeniorFinalReview/,
  "The authoritative GPT-5.5 result must not enter Product Engine, a queue or another AI score gate"
);

const finalizerFunction = extractFunction(
  "finalizeCarouselFromPrimaryCampaignWebResearch",
  "findProductUrlWithWebSearch"
);
assert.match(finalizerFunction, /const rankedProducts = validProducts;/);
assert.match(
  finalizerFunction,
  /selectedProducts = rankedProducts\.slice\(\s*0,\s*CAROUSEL_PRODUCT_SLIDE_TARGET/
);
assert.match(finalizerFunction, /authoritative_gpt_ranking_preserved: true/);
assert.match(finalizerFunction, /product_engine_verification_skipped: true/);
assert.match(finalizerFunction, /legacy_180_candidate_flow_skipped: true/);
assert.doesNotMatch(
  finalizerFunction,
  /getFreshCarouselProductCandidates|selectCampaignCarouselProductsWithSeniorFinalReview|applyAiCampaignFitScores/,
  "No local freshness or semantic reranker may change GPT-5.5's order"
);

const preparationStart = route.indexOf(
  "async function prepareCarouselProductsForRule"
);
const preparationEnd = route.indexOf(
  "function getPostDestinationUrl",
  preparationStart
);
const preparation = route.slice(preparationStart, preparationEnd);
const authoritativeStart = preparation.indexOf(
  "const canUsePrimaryCampaignWebResearch"
);
const authoritativeEnd = preparation.indexOf(
  "// Only explicitly focused customer URLs",
  authoritativeStart
);
assert.ok(authoritativeStart >= 0 && authoritativeEnd > authoritativeStart);
const authoritativeBlock = preparation.slice(
  authoritativeStart,
  authoritativeEnd
);
assert.match(
  authoritativeBlock,
  /researchRound <= CAMPAIGN_PRIMARY_WEB_RESEARCH_MAX_ROUNDS/
);
assert.match(authoritativeBlock, /usedWebsiteItems: researchExclusions/);
assert.match(
  authoritativeBlock,
  /CAMPAIGN_AUTHORITATIVE_WEB_RESEARCH_INSUFFICIENT_ASSETS/
);
assert.match(authoritativeBlock, /return primaryWebResearchResult;/);
assert.match(authoritativeBlock, /throw error;/);
assert.doesNotMatch(
  authoritativeBlock,
  /loadWebsiteProductCandidateQueue|verifyDiscoveredWebsiteProductCandidates|ensureProductSearchQueriesForRule|continuing with.*fallback/,
  "Whole-site campaigns must return or fail inside the authoritative web-agent path"
);

const trustedSignalFunction = extractFunction(
  "isPrimaryCampaignWebResearchProduct",
  "findMatchingPrimaryWebResearchCandidate"
);
assert.match(trustedSignalFunction, /authoritative_web_agent_selected === true/);
assert.doesNotMatch(
  trustedSignalFunction,
  /product_page_verified === true/,
  "Product Engine page-proof must not be required for authoritative GPT-5.5 products"
);

console.log(
  "v143.11 authoritative GPT-5.5 domain web-agent tests passed."
);
