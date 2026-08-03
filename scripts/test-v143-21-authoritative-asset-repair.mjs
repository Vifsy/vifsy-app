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

assert.match(route, /CAMPAIGN_PRIMARY_ASSET_REPAIR_TIMEOUT_MS/);
assert.match(route, /CAMPAIGN_PRIMARY_POST_RESEARCH_RESERVE_MS/);

const repair = extractFunction(
  "repairAuthoritativeWebAgentProductAssets",
  "hydrateAuthoritativeWebAgentProduct"
);
assert.match(repair, /model: PRODUCT_RESEARCH_MODEL/);
assert.match(repair, /type: "web_search"/);
assert.match(repair, /allowed_domains: \[allowedDomain\]/);
assert.match(repair, /search_context_size: "high"/);
assert.match(repair, /exact product-title searches/);
assert.match(repair, /CURRENT canonical direct product page/);
assert.match(repair, /best direct product-image file URL/);
assert.match(repair, /Preserve original_rank exactly/);
assert.match(repair, /isRecoveredAuthoritativeProductIdentity/);
assert.match(repair, /gpt55_exact_canonical_asset_repair/);
assert.doesNotMatch(
  repair,
  /buildStoreSearchUrls|extractProductCardCandidatesFromHtml|renderHtml/,
  "Exact asset repair must use public web research, not a retailer search endpoint"
);

const primary = extractFunction(
  "findPrimaryCampaignProductsWithWebSearch",
  "finalizeCarouselFromPrimaryCampaignWebResearch"
);
assert.match(primary, /repairAuthoritativeWebAgentProductAssets/);
assert.match(primary, /\[404, 410\]\.includes/);
assert.match(primary, /exactWebRepairExecuted/);
assert.doesNotMatch(
  primary,
  /discoverPrimaryWebResearchTechnicalRecoveryCandidates/,
  "The active authoritative path must not fall back to the retailer's search endpoint"
);
assert.match(primary, /const requestTimeoutMs = Math\.min/);
assert.match(
  primary,
  /remainingBudgetMs - CAMPAIGN_PRIMARY_POST_RESEARCH_RESERVE_MS/
);
assert.match(primary, /requestTimeoutMs < 25_000/);
assert.match(primary, /executed: false/);
assert.match(primary, /executed: true/);
assert.doesNotMatch(
  primary,
  /remainingBudgetMs < CAMPAIGN_PRIMARY_WEB_RESEARCH_TIMEOUT_MS \+ 30_000/,
  "Research must use the available bounded timeout instead of a fixed 90-second gate"
);

const preparationStart = route.indexOf(
  "async function prepareCarouselProductsForRule"
);
const preparationEnd = route.indexOf(
  "function getPostDestinationUrl",
  preparationStart
);
assert.ok(preparationStart >= 0 && preparationEnd > preparationStart);
const preparation = route.slice(preparationStart, preparationEnd);
const resultIndex = preparation.indexOf("const roundResult = await");
const executedIndex = preparation.indexOf("if (!roundResult?.executed)", resultIndex);
const pushIndex = preparation.indexOf("researchRounds.push(roundResult)", resultIndex);
assert.ok(
  resultIndex >= 0 && executedIndex > resultIndex && pushIndex > executedIndex,
  "Only research requests that actually ran may count as completed rounds"
);

assert.doesNotMatch(
  route,
  /horze\.se|isover\.(?:se|com)/i,
  "The fix must remain generic and must not hard-code the test retailers"
);

console.log("v143.21 authoritative canonical URL and asset repair checks passed.");
