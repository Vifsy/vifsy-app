import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectProductImageCandidates,
  findSharedProductImageAssetKeys,
  isViableProductImageIdentityAnchor,
  selectLargestVerifiedProductImage,
} from "../lib/productImageResolver.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routeSource = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const resolverSource = fs.readFileSync(
  path.join(root, "lib/productImageResolver.js"),
  "utf8"
);

const siteMark =
  "https://shop.example.test/assets/part-of-network.png";
const productImage =
  "https://shop.example.test/products/trail-vest-main.jpg";
const pageUrl =
  "https://shop.example.test/product/trail-vest";
const html = `
  <html>
    <head>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Trail Vest",
          "url": "${pageUrl}",
          "image": ["${productImage}"]
        }
      </script>
    </head>
    <body>
      <header>
        <img src="${siteMark}" alt="Part of our retail network">
      </header>
      <main class="product-gallery">
        <img src="${productImage}" alt="Trail Vest">
      </main>
    </body>
  </html>
`;

assert.equal(
  isViableProductImageIdentityAnchor({ width: 100, height: 100 }),
  false,
  "a tiny site asset must never become the product identity anchor"
);
assert.equal(
  isViableProductImageIdentityAnchor({ width: 600, height: 800 }),
  true,
  "a normal product image may remain the identity anchor"
);
assert.equal(
  isViableProductImageIdentityAnchor({ width: 200, height: 289 }),
  true,
  "a genuine thumbnail may anchor an upgrade to the same higher-resolution asset"
);

const candidates = collectProductImageCandidates({
  html,
  pageUrl,
  primaryImageUrl: siteMark,
  productTitle: "Trail Vest",
});
const selection = await selectLargestVerifiedProductImage({
  candidates,
  primaryImageUrl: siteMark,
  inspectImage: async (url) => {
    if (url === siteMark) {
      return {
        width: 100,
        height: 100,
        fingerprint: new Array(256).fill(10),
      };
    }
    if (url === productImage) {
      return {
        width: 1800,
        height: 1800,
        fingerprint: new Array(256).fill(180),
      };
    }
    throw new Error(`Unexpected fixture URL: ${url}`);
  },
});
assert.equal(
  selection.selected.url,
  productImage,
  "an explicit Product.image must replace a tiny incorrect primary site asset"
);
assert.equal(selection.selected.identityVerified, true);
assert.equal(
  selection.selected.identityMethod,
  "trusted_page_primary_without_existing_image"
);
assert.equal(selection.preferredQuality, true);

const sharedKeys = findSharedProductImageAssetKeys([
  {
    url: "https://shop.example.test/product/one",
    image_url: siteMark,
  },
  {
    url: "https://shop.example.test/product/two",
    image_url: siteMark,
  },
  {
    url: "https://shop.example.test/product/two",
    image_url: siteMark,
  },
]);
assert.equal(sharedKeys.size, 1);

const repeatedSameProductOnly = findSharedProductImageAssetKeys([
  {
    url: "https://shop.example.test/product/one",
    image_url: siteMark,
  },
  {
    url: "https://shop.example.test/product/one/",
    image_url: siteMark,
  },
]);
assert.equal(
  repeatedSameProductOnly.size,
  0,
  "repeated rows for one product must not be treated as a cross-product asset"
);

const extractorStart = routeSource.indexOf(
  "function extractBestProductImageFromHtml"
);
const extractorEnd = routeSource.indexOf(
  "async function extractProductDataFromProductPage",
  extractorStart
);
const extractorSource = routeSource.slice(extractorStart, extractorEnd);
assert.ok(extractorStart >= 0 && extractorEnd > extractorStart);
assert.ok(
  extractorSource.indexOf("getProductImageFromJsonLd") <
    extractorSource.indexOf("selectMostLikelyMainProductGalleryImage"),
  "Product.image must be considered before a generic gallery inference"
);

const hydrationStart = routeSource.indexOf(
  "async function hydrateAuthoritativeWebAgentProduct"
);
const hydrationEnd = routeSource.indexOf(
  "async function findPrimaryCampaignProductsWithWebSearch",
  hydrationStart
);
const hydrationSource = routeSource.slice(hydrationStart, hydrationEnd);
assert.match(
  hydrationSource,
  /const imageUrl\s*=\s*productImage\s*\|\|\s*pageImage\s*\|\|/,
  "the authoritative web-agent path must prefer Product.image"
);

const resolverStart = routeSource.indexOf(
  "async function resolveLargestProductImagesBeforeGeneration"
);
const resolverEnd = routeSource.indexOf(
  "\nfunction ",
  resolverStart
);
const routeResolverSource = routeSource.slice(resolverStart, resolverEnd);
assert.match(routeResolverSource, /findSharedProductImageAssetKeys/);
assert.match(routeResolverSource, /sharedPrimaryImageRejected/);
assert.match(
  routeResolverSource,
  /candidate\?\.assetKey !== primaryAssetKey/,
  "a shared primary asset must be removed before image selection"
);
assert.doesNotMatch(
  `${routeResolverSource}\n${resolverSource}`,
  /teamsportia|bike[-_ ]?nation|boozt|zalando/i,
  "the image correction must remain store independent"
);

console.log("v143.13 product-image anchor regression tests passed.");
