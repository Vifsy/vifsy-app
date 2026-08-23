import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

assert.match(
  route,
  /function isWebsiteSecurityBlockedError\(error\)[\s\S]{0,700}status === 403[\s\S]{0,700}website returned 403/i,
  "403/security-block detection is missing"
);

assert.match(
  route,
  /async function findWebsiteProductWithWebSearch\([\s\S]{0,700}allowIndexedSecurityFallback = false/,
  "Indexed security fallback must default to off so existing callers are unchanged"
);

const optInCount = (route.match(/allowIndexedSecurityFallback:\s*true/g) || []).length;
assert.equal(
  optInCount,
  1,
  "Only the existing single-product preparation path may opt into the new fallback"
);

assert.match(
  route,
  /allowIndexedSecurityFallback &&[\s\S]{0,350}isWebsiteSecurityBlockedError\(directProductError\)[\s\S]{0,2200}repairAuthoritativeWebAgentProductAssets\([\s\S]{0,1800}hydrateAuthoritativeWebAgentProduct\(/,
  "403 fallback must use exact official-domain web repair and then the locked-product hydrator"
);

assert.match(
  route,
  /MAX_INDEXED_SECURITY_FALLBACK_ATTEMPTS = 3/,
  "Indexed fallback must be bounded"
);

assert.match(
  route,
  /image_is_main_product_asset !== true[\s\S]{0,450}!sameOpenedProductPage[\s\S]{0,450}!String\(repairedProduct\?\.identity_evidence/,
  "Existing exact-repair safety gate must still require main-product image, same official page, and identity evidence"
);

assert.match(
  route,
  /product_identity_locked:\s*true[\s\S]{0,800}locked_product_primary_image_url:\s*imageUrl/,
  "Recovered product image must be locked as the authoritative original asset"
);

const fallbackStart = route.indexOf("// v144.10: when a retailer blocks Spreelo's direct crawler");
const fallbackEnd = route.indexOf('if (verificationCache instanceof Map && cacheKey)', fallbackStart);
assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart, "Could not locate fallback block");
const fallbackBlock = route.slice(fallbackStart, fallbackEnd);
assert.ok(!/gpt-image|images\.generate|generateImage|createImage/i.test(fallbackBlock), "403 fallback must never generate or redraw the product image");

console.log("v144.10 indexed 403 exact-product fallback checks passed");
