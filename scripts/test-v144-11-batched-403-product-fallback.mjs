import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

assert.match(
  route,
  /function isIndexedSecurityFallbackLockedProduct\(item\)[\s\S]{0,700}indexed_security_fallback_verified === true[\s\S]{0,700}technical_identity_same_page_verified === true/,
  "Indexed 403 products must have a dedicated locked-product guard"
);

assert.match(
  route,
  /MAX_INDEXED_SECURITY_FALLBACK_BATCHES = 1/,
  "403 exact-product repair must be limited to one paid batch per web-research run"
);

assert.match(
  route,
  /recoverIndexedSecurityBlockedBatch[\s\S]{0,6000}selectedCandidates: repairInputs[\s\S]{0,6000}modelCallsForExactRepair: 1/,
  "Security fallback must repair a whole candidate batch in one exact GPT-5.5 call"
);

assert.doesNotMatch(
  route,
  /selectedCandidates:\s*\[indexedRepairCandidate\]/,
  "Per-product GPT-5.5 403 repairs from v144.10 must be removed"
);

assert.match(
  route,
  /isWebsiteSecurityBlockedError\(directProductError\)[\s\S]{0,1800}recoverIndexedSecurityBlockedBatch\([\s\S]{0,1800}return getIndexedFallbackItems\(\)/,
  "First real 403 must switch to the one-batch fallback and stop the extra attempts"
);

assert.match(
  route,
  /const attempts = \["best_match", "domain_site_search", "backup_broad"\][\s\S]{0,500}knownSecurityBlocked[\s\S]{0,300}\? 1/,
  "Known 403 domains must not start three web-research attempts"
);

const optInCount = (route.match(/allowIndexedSecurityFallback:\s*true/g) || []).length;
assert.ok(
  optInCount >= 5,
  `Expected shared 403 fallback opt-in across single + carousel product paths, got ${optInCount}`
);

assert.match(
  route,
  /desiredVerifiedCount:\s*1[\s\S]{0,300}indexedSecurityRepairBatchSize:\s*4/,
  "Single-product formats should need one product while recovering a small reserve batch"
);

assert.match(
  route,
  /desiredVerifiedCount:\s*CAROUSEL_PRODUCT_SLIDE_TARGET[\s\S]{0,300}indexedSecurityRepairBatchSize:\s*8/,
  "Carousel product fallback must recover multiple exact products in one batch"
);

assert.match(
  route,
  /Campaign carousel using known-403 indexed product fallback[\s\S]{0,7000}Campaign carousel completed from one indexed 403 fallback batch/,
  "Whole-site campaign carousels must have a known-403 one-batch path before old multi-round research"
);

assert.match(
  route,
  /const indexedSecurityFallbackState = \{[\s\S]{0,300}batchExecuted: false[\s\S]{0,300}recoveredItems: \[\]/,
  "Carousel preparation must share one 403 fallback state across all discovery stages"
);

assert.match(
  route,
  /Indexed security fallback reused prior batch in the same product preparation run[\s\S]{0,500}additionalModelCalls: 0/,
  "Later carousel fallback stages must reuse the first batch without another model call"
);

assert.match(
  route,
  /const finalizePreparedWebsiteItem[\s\S]{0,800}isIndexedSecurityFallbackLockedProduct\(item\)/,
  "Single-product preparation must not repeat exact GPT repair for an already locked indexed product"
);

assert.match(
  route,
  /async function ensureLockedProductPoolForUse[\s\S]{0,1800}isIndexedSecurityFallbackLockedProduct\(item\)/,
  "Carousel pool preparation must not repeat exact GPT repair for already locked indexed products"
);

assert.match(
  route,
  /indexed_security_fallback_pool/,
  "The full one-call indexed batch must be persisted for single-product reserves"
);

assert.match(
  route,
  /skipped direct reserve discovery for indexed 403 product/,
  "Blocked retailers must not be crawled again just to fill optional single-product reserves"
);

assert.match(
  route,
  /looksLikeSchedulingUiFragment = \/\\bdays\?\\s\+before\\b\/iu[\s\S]{0,350}looksLikeSchedulingUiFragment/,
  "Relative schedule labels must be filtered out of product-search vocabulary"
);

assert.match(
  route,
  /image_is_main_product_asset !== true[\s\S]{0,450}!sameOpenedProductPage[\s\S]{0,450}!String\(repairedProduct\?\.identity_evidence/,
  "Exact image safety gate must still require same-page main-product binding"
);

assert.match(
  route,
  /locked_product_primary_image_url:\s*imageUrl/,
  "Exact original image must remain the locked product asset"
);

console.log("v144.11 batched 403 product fallback checks passed");
