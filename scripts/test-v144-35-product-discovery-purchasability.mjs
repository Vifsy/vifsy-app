import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routePath = path.join(root, "app/api/cron/run-automations/route.js");
const source = fs.readFileSync(routePath, "utf8");

for (const name of [
  "getProductUrlFromJsonLd",
  "extractJsonLdProductCandidatesFromHtml",
  "extractProductUrlCandidatesFromText",
]) {
  const definitionCount = (source.match(new RegExp(`function\\s+${name}\\s*\\(`, "g")) || []).length;
  assert.equal(definitionCount, 1, `${name} must have exactly one runtime definition`);
}

assert.match(
  source,
  /const safeMetadata = Object\.fromEntries\([\s\S]*Object\.entries\(item \|\| \{\}\)[\s\S]*\.\.\.safeMetadata,/,
  "normalizeWebsiteItem must preserve non-price verification metadata"
);

assert.match(
  source,
  /availability === "available"[\s\S]*product_page_verified === true[\s\S]*concrete_product_verified === true[\s\S]*purchase_action_detected === true/,
  "fresh verified product pages with a purchase action must be accepted as purchasable"
);

assert.match(
  source,
  /if \(\/\\b\(\?:out of stock\|sold out\|slut i lager\|ej i lager\|currently unavailable\)\\b\/i\.test\(pageText\)\) \{[\s\S]*return "out_of_stock";[\s\S]*if \(hasDirectProductPurchaseAction\(html\)\) return "available";/,
  "explicit unavailable signals must still outrank purchase-action availability"
);

// Product prices must remain absent from product payload/runtime field names.
assert.doesNotMatch(
  source,
  /\b(?:locked_product_price|product_price|sale_price|original_price|price_source|price_confidence|price_rejected_reason|visible_price|current_price)\b/
);

console.log("v144.35 product discovery + purchasability regression checks passed.");
