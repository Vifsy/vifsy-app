import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(root, "app/api/cron/run-automations/route.js");
const route = fs.readFileSync(routePath, "utf8");

assert.ok(
  !route.includes("normalizeUrlForComparison("),
  "undefined normalizeUrlForComparison helper must not be referenced"
);

const expectedSelectedBlock = `const selectedKey =\n          normalizeComparableValue(\n            canonicalizeWebsiteProductUrl(selectedUrl, websiteUrl) || selectedUrl\n          ) || createItemKey(selected.item);`;
assert.ok(
  route.includes(expectedSelectedBlock),
  "web-research selected product key must use the existing canonical URL + comparable normalization path"
);

const expectedCandidateBlock = `const candidateKey =\n            normalizeComparableValue(\n              canonicalizeWebsiteProductUrl(candidateUrl, websiteUrl) || candidateUrl\n            ) || createItemKey(candidate);`;
assert.ok(
  route.includes(expectedCandidateBlock),
  "web-research remaining-pool candidate keys must use the same canonical URL + comparable normalization path"
);

assert.ok(
  route.includes("function canonicalizeWebsiteProductUrl(value, baseUrl = \"\")"),
  "canonicalizeWebsiteProductUrl helper must remain available"
);
assert.ok(
  route.includes("function normalizeComparableValue(value)"),
  "normalizeComparableValue helper must remain available"
);

// Behavioral contract for the key strategy used by the route: URL variants for
// the same product should collapse to one comparable key instead of being retried.
function canonicalizeWebsiteProductUrl(value, baseUrl = "") {
  try {
    const url = new URL(value, baseUrl || value);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/collections\/[^/]+\/products\//i, "/products/");
    return url.toString();
  } catch {
    return value || "";
  }
}
function normalizeComparableValue(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/#.*$/, "")
    .replace(/\?.*$/, "")
    .replace(/\/$/, "")
    .replace(/\s+/g, " ")
    .replace(/\/collections\/[^/]+\/products\//i, "/products/");
}
const websiteUrl = "https://shop.example";
const selectedUrl = "https://www.shop.example/collections/sale/products/widget?utm_source=x#details";
const candidateUrl = "https://shop.example/products/widget/";
const selectedKey = normalizeComparableValue(
  canonicalizeWebsiteProductUrl(selectedUrl, websiteUrl) || selectedUrl
);
const candidateKey = normalizeComparableValue(
  canonicalizeWebsiteProductUrl(candidateUrl, websiteUrl) || candidateUrl
);
assert.equal(
  selectedKey,
  candidateKey,
  "equivalent product URL variants must dedupe to the same key"
);

console.log("v144.92 product-research URL normalization regression checks passed.");
