import fs from "node:fs";
import assert from "node:assert/strict";
import { normalizeIntlLocale, wrapProductTitle } from "../lib/globalProductTypography.js";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const adminRegenerate = fs.readFileSync(
  "app/api/admin/post-approvals/regenerate-product/route.js",
  "utf8"
);
const typography = fs.readFileSync("lib/globalProductTypography.js", "utf8");

// Keep the safe local carousel locale fix from v144.15.
assert.equal(normalizeIntlLocale("sv_SE"), "sv-SE");
assert.equal(normalizeIntlLocale("en_US"), "en-US");
assert.equal(normalizeIntlLocale("Svenska (Sverige)"), "und");
assert.doesNotThrow(() =>
  wrapProductTitle("Acer Predator Orion 7000", {
    fontSize: 32,
    maxWidth: 340,
    languageHint: "Svenska (Sverige)",
  })
);
assert.match(typography, /new Intl\.Segmenter\(safeLocale/);

// v144.16 removes the new v144.15 whole-product/availability hard gate.
for (const forbidden of [
  "prepareGenerativeProductReferenceCandidates",
  "selectGenerativeProductReferenceImage",
  "Generative product candidate skipped because it is clearly unavailable",
  "Generative product media could not find an available official image where the complete product is visible",
  "No official product image showed the complete verified product",
  "full_product_reference_image_url",
  "full_product_reference_visible",
  "availability_status",
]) {
  assert.ok(!route.includes(forbidden), `Unsafe v144.15 gate still present: ${forbidden}`);
}
assert.ok(
  !adminRegenerate.includes("prepareGenerativeProductReferenceCandidates"),
  "Admin regeneration must not gain a new whole-product hard gate"
);

// Restore the previously stable Kling product selection path: use the exact
// verified source image directly, without a new retailer-gallery dependency.
assert.match(route, /Kling needs the exact verified source image/);
assert.match(route, /fetchImageBufferForOverlay\(authoritativeImageUrl\)/);
assert.doesNotMatch(route, /Could not inspect product gallery for a clean animated product image[\s\S]{0,1200}isKlingAiVideoRule/);

// Keep the safer first-frame composition but do not claim a whole product is
// visible. A cropped official reference remains cropped instead of being
// completed/invented by prompt instruction.
assert.match(route, /async function createKlingProductReferenceFrame/);
assert.match(route, /verifiedReferenceLargeFromFirstFrame:\s*true/);
assert.match(route, /generatedProductPixels:\s*false/);
assert.match(route, /neutral generated backdrop/);
assert.match(route, /never extend or complete product areas that are not visible/i);
assert.match(route, /If the retailer reference is cropped, keep that same crop/i);
assert.doesNotMatch(route, /first frame is authoritative and already contains the complete product/i);
assert.doesNotMatch(route, /complete marketed product is already visible/i);

// Keep the Kling sales/viral direction and readable-text beta.
assert.match(route, /TEXT BETA/);
assert.match(route, /overlay_text/);
assert.match(route, /Render only these exact readable overlay phrases/);
assert.match(route, /pattern interrupt/i);
assert.match(route, /clear final payoff/i);
assert.match(route, /no prices, discounts, percentages, dates, stock claims, technical specifications/i);

// The existing one-paid-Kling invariant must remain unchanged.
const klingSubmitCount = (route.match(/await submitKlingImageToVideo\(/g) || []).length;
assert.equal(klingSubmitCount, 1, `Expected exactly one Kling submission call, got ${klingSubmitCount}`);
assert.match(route, /claim_kling_video_generation/);

console.log("v144.16 no-hard-gate regression checks passed");
