import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  classifyCommercePage,
  dedupeProductCandidateQueueRows,
  detectCommercePlatform,
  isLikelyProductDetailUrl,
} from "../lib/productEngineV2.js";

assert.equal(
  detectCommercePlatform({
    url: "https://example.test/products",
    html: '<img src="/image/catalog/large-product.webp">',
  }),
  "generic",
  "ordinary /image/ paths must not be interpreted as Magento"
);

assert.equal(
  detectCommercePlatform({
    url: "https://example.test",
    html: '<script type="text/x-magento-init">{"*":{}}</script>',
  }),
  "magento"
);

const headlessProductUrl =
  "https://shop.example.test/brand/product-name-ab123c456-d11.html";
assert.equal(isLikelyProductDetailUrl(headlessProductUrl), true);

const recommendationCards =
  '<article class="product-card"><a href="/brand/recommended-ab123c456-d11.html">Related</a></article>'.repeat(
    12
  );

const headlessProduct = classifyCommercePage({
  url: headlessProductUrl,
  html: `<html><head>
    <link rel="canonical" href="${headlessProductUrl}">
    <meta property="og:image" content="https://cdn.example.test/image/main.webp">
  </head><body><h1>Product name</h1><button>Choose size</button>${recommendationCards}</body></html>`,
  productSchemaFound: false,
  ecommerceProofFound: true,
});
assert.equal(headlessProduct.pageType, "product");
assert.equal(headlessProduct.reason, "product_with_recommendations");

const metadataProductUrl = "https://shop.example.test/presentation/unique-item";
const metadataProduct = classifyCommercePage({
  url: metadataProductUrl,
  html: `<html><head>
    <link rel="canonical" href="${metadataProductUrl}">
    <meta property="og:type" content="product">
    <meta property="og:image" content="https://cdn.example.test/media/item.webp">
    <meta property="product:price:amount" content="1299">
  </head><body><h1>Unique item</h1>${recommendationCards}</body></html>`,
  productSchemaFound: false,
  ecommerceProofFound: false,
});
assert.equal(metadataProduct.pageType, "product");

const listing = classifyCommercePage({
  url: "https://shop.example.test/category/shoes",
  html: `<html><body><h1>Shoes</h1>${recommendationCards}</body></html>`,
  productSchemaFound: true,
  ecommerceProofFound: false,
});
assert.equal(listing.pageType, "category");
assert.equal(listing.reason, "multiple_product_cards");

const candidateRows = dedupeProductCandidateQueueRows([
  {
    brand_profile_id: "brand-1",
    product_url: "https://shop.example.test/item",
    canonical_product_url: "https://shop.example.test/item",
    title: "Lower score",
    discovery_score: 10,
    image_url: null,
    metadata: { source: "first" },
  },
  {
    brand_profile_id: "brand-1",
    product_url: "https://shop.example.test/item",
    canonical_product_url: "https://shop.example.test/item",
    title: "Higher score",
    discovery_score: 80,
    image_url: "https://cdn.example.test/item.webp",
    metadata: { platform: "generic" },
  },
]);
assert.equal(candidateRows.length, 1);
assert.equal(candidateRows[0].title, "Higher score");
assert.equal(candidateRows[0].image_url, "https://cdn.example.test/item.webp");
assert.deepEqual(candidateRows[0].metadata, {
  source: "first",
  platform: "generic",
});

const workerSource = await readFile(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);
const browserSource = await readFile(
  new URL("../lib/headlessProductImageBrowser.js", import.meta.url),
  "utf8"
);

assert.match(workerSource, /renderProductPage/);
assert.match(
  workerSource,
  /Product verification stopped after repeated ambiguous product pages/
);
assert.match(workerSource, /dedupeProductCandidateQueueRows/);
assert.match(browserSource, /async renderHtml\(\{ pageUrl \}\)/);

console.log("v142.2 generic product verification tests passed.");
