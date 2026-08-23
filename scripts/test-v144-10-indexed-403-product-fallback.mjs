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
assert.ok(
  optInCount >= 1,
  "At least one product preparation path must opt into the exact indexed fallback"
);

assert.match(
  route,
  /recoverIndexedSecurityBlockedBatch[\s\S]{0,7000}repairAuthoritativeWebAgentProductAssets\([\s\S]{0,5000}hydrateAuthoritativeWebAgentProduct\(/,
  "403 fallback must use exact official-domain web repair and then the locked-product hydrator"
);

assert.match(
  route,
  /MAX_INDEXED_SECURITY_FALLBACK_(?:ATTEMPTS|BATCHES) = (?:\d+|knownSecurityBlocked \? (?:2|3) : 1)/,
  "Indexed fallback must remain bounded"
);

assert.match(
  route,
  /image_is_main_product_asset !== true[\s\S]{0,450}!sameOpenedProductPage[\s\S]{0,450}!String\(repairedProduct\?\.identity_evidence/,
  "Existing exact-repair safety gate must still require main-product image, same official page, and identity evidence"
);

assert.match(
  route,
  /product_identity_locked:\s*true[\s\S]{0,1600}locked_product_primary_image_url:\s*imageUrl/,
  "Recovered product image must be locked as the authoritative original asset"
);

const fallbackStart = route.indexOf("const recoverIndexedSecurityBlockedBatch = async");
const fallbackEnd = route.indexOf("for (const attempt of attempts)", fallbackStart);
assert.ok(fallbackStart >= 0 && fallbackEnd > fallbackStart, "Could not locate fallback block");
const fallbackBlock = route.slice(fallbackStart, fallbackEnd);
assert.ok(!/gpt-image|images\.generate|generateImage|createImage/i.test(fallbackBlock), "403 fallback must never generate or redraw the product image");

console.log("v144.10 indexed 403 exact-product fallback checks passed");
