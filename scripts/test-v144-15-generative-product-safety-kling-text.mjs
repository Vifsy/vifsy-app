import fs from "node:fs";
import assert from "node:assert/strict";
import { normalizeIntlLocale, wrapProductTitle } from "../lib/globalProductTypography.js";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");
const adminRegenerate = fs.readFileSync(
  "app/api/admin/post-approvals/regenerate-product/route.js",
  "utf8"
);
const typography = fs.readFileSync("lib/globalProductTypography.js", "utf8");

// Carousel locale rendering must never fail because a brand/content language is
// human-readable or uses the common underscore locale form.
assert.equal(normalizeIntlLocale("sv_SE"), "sv-SE");
assert.equal(normalizeIntlLocale("en_US"), "en-US");
assert.doesNotThrow(() => new Intl.Segmenter(normalizeIntlLocale("Svenska"), { granularity: "word" }));
assert.equal(normalizeIntlLocale("Svenska (Sverige)"), "und");
assert.equal(normalizeIntlLocale(""), "und");
assert.doesNotThrow(() => wrapProductTitle("Acer Predator Orion 7000", { fontSize: 32, maxWidth: 340, languageHint: "sv_SE" }));
assert.match(typography, /new Intl\.Segmenter\(safeLocale/);
assert.doesNotMatch(typography, /new Intl\.Segmenter\(locale/);

// A known-403 carousel batch that cannot possibly satisfy the requested pool
// must not spend the exact-repair call merely to discover it is too small.
assert.match(
  route,
  /targetVerifiedCount > 1[\s\S]{0,500}repairInputs\.length < targetVerifiedCount[\s\S]{0,900}paidExactRepairSkipped:\s*true/,
  "Impossible known-403 carousel repair batches must be skipped before the paid exact-repair call"
);

// Exact repair must expose multiple official gallery candidates, a designated
// complete-product reference and purchase availability without weakening the
// same-page product lock.
for (const required of [
  "gallery_image_urls",
  "full_product_reference_image_url",
  "full_product_reference_visible",
  "availability_status",
  "availability_evidence",
]) {
  assert.ok(route.includes(required), `Missing exact-repair field ${required}`);
}
assert.match(route, /locked_product_primary_image_url:\s*imageUrl/);
assert.match(route, /locked_product_image_urls:\s*galleryImageUrls/);

// Generative media gets a separate, conservative full-product reference gate.
assert.match(route, /export async function selectGenerativeProductReferenceImage/);
assert.match(route, /validates the actual image pixels before any paid/);
assert.doesNotMatch(route, /selectionMethod:\s*"authoritative_product_gallery"/);
assert.match(route, /full_product_visible/);
assert.match(route, /cropped_by_frame/);
assert.match(route, /detail_or_closeup/);
assert.match(route, /packaging_only/);
assert.match(route, /confidence[^\n]*0\.88|Number\(review\?\.confidence \|\| 0\) >= 0\.88/);
assert.match(route, /export async function prepareGenerativeProductReferenceCandidates/);
assert.match(route, /isProductClearlyUnavailableForPromotion\(item\)/);
assert.match(route, /Generative product candidate skipped because it is clearly unavailable/);

// The automation must do the gate before either AI product-ad image generation
// or animated video generation, and reserve products remain available.
assert.match(
  route,
  /needsCompleteGenerativeProductReference[\s\S]{0,3000}prepareGenerativeProductReferenceCandidates[\s\S]{0,3500}if \(isAnimatedVideoRule/,
  "Generative full-product preflight must run before animated video preparation"
);
assert.match(route, /isWebsiteTextAdRule\(websitePreparedRule \|\| rule\)/);
assert.match(adminRegenerate, /prepareGenerativeProductReferenceCandidates/);

// Kling first frame: product is large from frame one, product pixels are kept
// from the verified official image, and the former tiny contain-on-blank-canvas
// construction is no longer the paid generation reference.
assert.match(route, /async function createKlingProductReferenceFrame/);
assert.match(route, /fit:\s*"cover"/);
assert.match(route, /prepareAnimatedProductCutout\(normalizedSource\)/);
assert.match(route, /fullProductLargeFromFirstFrame:\s*true/);
assert.match(route, /generatedProductPixels:\s*false/);
assert.match(route, /never animate a small picture card expanding to fill the screen/);

// Kling text beta: Kling receives short safe readable phrases, but factual
// prices/specs/availability remain forbidden. The old blanket readable-text ban
// must not be present in the Kling prompt.
assert.match(route, /TEXT BETA/);
assert.match(route, /overlay_text/);
assert.match(route, /Render only these exact readable overlay phrases/);
assert.match(route, /no prices, discounts, percentages, dates, stock claims, technical specifications/i);
assert.doesNotMatch(route, /Do not generate new readable overlay text/);

// Product-ad generation must be told to keep the complete verified product and
// never invent a hidden side.
assert.match(route, /complete product is visible/i);
assert.match(route, /Do not rotate the product to reveal, reconstruct or invent a hidden/i);

// The expensive Kling invariant is unchanged: exactly one submission call in
// the runtime, protected by the existing atomic one-generation claim.
const klingSubmitCount = (route.match(/await submitKlingImageToVideo\(/g) || []).length;
assert.equal(klingSubmitCount, 1, `Expected exactly one Kling submission call, got ${klingSubmitCount}`);
assert.match(route, /claim_kling_video_generation/);

console.log("v144.15 generative product safety + Kling text beta checks passed");
