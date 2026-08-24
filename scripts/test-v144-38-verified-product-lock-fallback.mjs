import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

for (const required of [
  'const exactProductPageVerified = Boolean(',
  'pageClassification.pageType === "product"',
  'purchaseActionDetected',
  'const exactPageGalleryImage = extractBestProductImageFromHtml(',
  '"exact_product_page_gallery"',
  'purchase_action_detected: Boolean(',
  '["in_stock", "available"].includes(availabilityStatus)',
  'allowAiRepair = true',
  'Store Map verified product could not be locked; trying next verified product',
  '{ allowAiRepair: false }',
]) {
  assert.ok(source.includes(required), `missing required v144.38 guard: ${required}`);
}

for (const forbidden of [
  'locked_product_price',
  'product_price',
  'sale_price',
  'original_price',
  'price_source',
  'price_confidence',
  'price_rejected_reason',
  'visible_price',
  'current_price',
]) {
  assert.ok(!source.includes(forbidden), `product price field returned: ${forbidden}`);
}

console.log("v144.38 verified-product lock fallback regression checks passed.");
