import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  detectCommercePlatform,
  isLikelyProductDetailUrl,
  sanitizeProductSearchQueryList,
} from "../lib/productEngineV2.js";

const route = await readFile(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.deepEqual(
  sanitizeProductSearchQueryList(["festklänning", "paljettklänning"]),
  ["festklänning", "paljettklänning"],
  "retailer search queries must preserve local-language diacritics"
);

assert.equal(
  detectCommercePlatform({
    url: "https://shop.example.test/products",
    html: '<img src="/image/catalog/product.webp">',
  }),
  "generic",
  "ordinary image paths must not trigger Magento detection"
);
assert.equal(
  isLikelyProductDetailUrl(
    "https://shop.example.test/brand/product-name-ab123c456-d11.html"
  ),
  true,
  "headless .html product URLs must remain supported"
);

assert.match(route, /function splitStoreSearchQueryLine/);
assert.match(route, /CAMPAIGN_STORE_SEARCH_PRODUCT_FIT_SCORE = 55/);
assert.match(route, /Found by retailer search query:/);
assert.match(route, /hasTrustedCampaignStoreSearchSignal/);
assert.match(route, /Campaign store-search verification batch finished/);
assert.match(route, /CAMPAIGN_STORE_SEARCH_VERIFICATION_BATCH_SIZE = 15/);
assert.match(route, /selectBalancedStoreSearchCandidates/);
assert.match(route, /rendered_store_search_page/);
assert.match(route, /RENDERED_STORE_SEARCH_PAGE_LIMIT/);
assert.match(route, /technically verified, but only \$\{selectedProducts\.length\} passed/);

const prepareStart = route.indexOf("async function prepareCarouselProductsForRule");
const primarySearchMarker = route.indexOf(
  "The retailer's own search is the primary campaign retrieval path",
  prepareStart
);
const directSearch = route.indexOf(
  "await buildLockedCampaignSearchPool",
  primarySearchMarker
);
const storeMapFallback = route.indexOf(
  "await runStoreMapProductAgentOnce();",
  directSearch
);
assert.ok(prepareStart >= 0 && primarySearchMarker > prepareStart);
assert.ok(
  directSearch > primarySearchMarker && storeMapFallback > directSearch,
  "direct retailer search must run before Store Map"
);

const discoverySearchStart = route.indexOf(
  "function buildCampaignDiscoverySearches"
);
const discoverySearchEnd = route.indexOf(
  "function buildLikelyDiscoveryUrls",
  discoverySearchStart
);
const discoverySearchBlock = route.slice(
  discoverySearchStart,
  discoverySearchEnd
);
assert.ok(
  discoverySearchBlock.indexOf("for (const query of dedicatedQueries)") <
    discoverySearchBlock.indexOf("for (const term of coreThemeTerms)"),
  "concrete product queries must precede broad theme searches"
);

console.log("v142.3 generic search-first campaign product tests passed.");
