import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCommercePage } from "../lib/productEngineV2.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(path.join(root, "app/api/cron/run-automations/route.js"), "utf8");
const productEngine = fs.readFileSync(path.join(root, "lib/productEngineV2.js"), "utf8");
const approvalPage = fs.readFileSync(path.join(root, "app/admin/post-approvals/page.jsx"), "utf8");
const approvalRoute = fs.readFileSync(path.join(root, "app/api/admin/post-approvals/route.js"), "utf8");
const regenerateRoute = fs.readFileSync(path.join(root, "app/api/admin/post-approvals/regenerate/route.js"), "utf8");
const regenerateProductRoute = fs.readFileSync(path.join(root, "app/api/admin/post-approvals/regenerate-product/route.js"), "utf8");
const stripeBilling = fs.readFileSync(path.join(root, "lib/stripeBilling.js"), "utf8");

for (const [name, source] of [
  ["automation route", route],
  ["product engine", productEngine],
  ["approval page", approvalPage],
  ["approval route", approvalRoute],
  ["carousel regenerate route", regenerateRoute],
  ["product regenerate route", regenerateProductRoute],
]) {
  assert.doesNotMatch(
    source,
    /\b(?:locked_product_price|product_price|sale_price|original_price|price_source|price_confidence|price_rejected_reason|visible_price|current_price)\b/,
    `${name} must not carry product-price fields after v144.34`
  );
}

assert.doesNotMatch(route, /extractProductPricingFromHtml|sanitizeCatalogPrice|getTrustedWebsiteItemPricing/);
assert.doesNotMatch(route, /"price"\s*:\s*"Visible price|Return the displayed price/);
assert.doesNotMatch(productEngine, /product:price:amount|priceCurrency|sanitizeCatalogPrice/);
assert.doesNotMatch(approvalPage, /priceOptional|product_price/);

// Price-like text is allowed only as a guardrail that prevents generated product prices.
assert.match(route, /Never mention, infer or display a product price/);
assert.match(route, /Do not search for or return a product price/);

// Spreelo billing prices are intentionally outside the product-price removal.
assert.match(stripeBilling, /\/v1\/prices/);
assert.match(stripeBilling, /Stripe price not found/);

const quickbutikProductHtml = `
  <link rel="canonical" href="https://secretdesire.se/for-henne/vibratorer/lelo-nea-3">
  <meta property="og:image" content="https://cdn.quickbutik.com/store/products/lelo-nea-3.jpg">
  <h1>LELO Nea 3</h1>
  <form class="product-form"><button>Add to cart</button></form>
  <div class="product-card">Related product 1</div>
  <div class="product-card">Related product 2</div>
  <div class="product-card">Related product 3</div>
  <div class="product-card">Related product 4</div>
`;

const classification = classifyCommercePage({
  url: "https://secretdesire.se/for-henne/vibratorer/lelo-nea-3",
  html: quickbutikProductHtml,
  productSchemaFound: false,
  ecommerceProofFound: true,
});

assert.equal(classification.pageType, "product");
assert.ok(classification.confidence >= 88);

console.log("v144.34 no-product-price + Quickbutik regression checks passed.");
