import assert from "node:assert/strict";
import fs from "node:fs";
import { haveProductTitlesIdentityAgreement } from "../lib/productEngineV2.js";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const adminApi = fs.readFileSync("app/api/admin/post-approvals/route.js", "utf8");
const adminPage = fs.readFileSync("app/admin/post-approvals/page.jsx", "utf8");

assert.equal(
  haveProductTitlesIdentityAgreement(
    "Kipling 100 PENS BTS - Pennfodral - true black",
    "Kipling CLASS ROOM BTS - Skolväska - black khaki block"
  ),
  false,
  "unrelated Kipling models must remain different products"
);
assert.equal(
  haveProductTitlesIdentityAgreement(
    "Nike Sportswear CLASSIC UNISEX - Ryggsäck - black / white",
    "CLASSIC UNISEX - Dagryggsäck - black / white"
  ),
  true,
  "brand-prefix/category wording differences on the same product must not cause false negatives"
);
assert.equal(
  haveProductTitlesIdentityAgreement(
    "Swedemount Regnbyxor - black",
    "Regnbyxor - black"
  ),
  true,
  "a retailer title that omits the brand must still match the same concrete product"
);
assert.equal(
  haveProductTitlesIdentityAgreement(
    "Converse BACKPACK PENCIL CASE SET - Pennfodral - black",
    "UNISEX - Dagryggsäck - black"
  ),
  false,
  "a backpack must not be accepted as a pencil-case set"
);

assert.match(route, /let combinedFinalVerifiedProducts = \[\]/);
assert.match(route, /Campaign final product identity pool updated/);
assert.match(route, /combinedFinalVerifiedProducts\.length >=\s*CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED/);
assert.match(route, /Campaign primary GPT-5\.5 web research continuing after final identity gate/);
assert.match(route, /product_image_semantic_verified === true/);
assert.match(route, /observed_brand: \{ type: "string" \}/);
assert.match(route, /hasHardSemanticBrandConflict/);
assert.match(route, /expected brand:/);
assert.match(route, /product_brand:\s*String\(product\?\.brand/);
assert.match(route, /Product image semantic identity gate reused final verified pool/);
assert.match(route, /carousel_product_verification_incomplete/);

assert.match(adminApi, /\.eq\("status", "failed_terminal"\)/);
assert.match(adminApi, /\.in\("status", \["running", "retry_pending"\]\)/);
assert.match(adminApi, /Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"/);
assert.match(route, /Durable admin review case write could not be verified/);
assert.match(route, /occurrence fallback remains active/);
assert.match(adminPage, /window\.setInterval\(refresh, 15000\)/);
assert.match(adminPage, /window\.addEventListener\("focus", refresh\)/);

console.log("v143.63 final product identity + admin reliability regression tests passed.");
