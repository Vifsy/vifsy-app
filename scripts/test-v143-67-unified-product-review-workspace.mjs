import assert from "node:assert/strict";
import fs from "node:fs";
import { canonicalProductImageAssetKey, generateGenericHighResolutionImageUrls } from "../lib/productImageResolver.js";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const cron = read("app/api/cron/run-automations/route.js");
const productEngine = read("lib/productEngineV2.js");
const resolver = read("lib/productImageResolver.js");
const adminPage = read("app/admin/post-approvals/page.jsx");
const adminResolve = read("app/api/admin/post-approvals/resolve-product/route.js");
const adminCarouselRegenerate = read("app/api/admin/post-approvals/regenerate/route.js");
const adminSingleRegenerate = read("app/api/admin/post-approvals/regenerate-product/route.js");
const css = read("app/styles/38-current-experience-v143.css");

assert.match(productEngine, /product-engine-v3-locked-object/);
for (const field of ["brand", "product_identifier", "display_product_type", "color", "product_identity_locked", "product_identity_fingerprint"]) {
  assert.ok(productEngine.includes(field), `product contract must include ${field}`);
}

assert.match(cron, /export async function resolveLockedProductUrlForUse/);
assert.match(cron, /async function ensureLockedProductPoolForUse/);
assert.match(cron, /unifiedLockedProductPipeline: true/);
assert.match(cron, /finalizePreparedWebsiteItem/);
assert.match(cron, /product_identity_locked === true/);
assert.match(cron, /Product identifier\/SKU:/);
assert.match(cron, /Locked same-page identity:/);

for (const family of [
  "emotional_hero",
  "clean_premium",
  "benefits_icons",
  "problem_solution",
  "technical_spec",
  "seasonal_campaign",
]) {
  assert.ok(cron.includes(family), `AI product ad must include ${family} layout family`);
}
assert.match(cron, /Do not default to the same left-text\/right-product feature-list layout/);

const isoverDerivative = "https://www.isover.se/sites/mac3.isover.se/files/styles/product_gallery/public/externals/53693938bf42a8894a22ff403ae3cbff.jpg.webp?itok=-bORZlsZ";
const isoverOriginal = "https://www.isover.se/sites/mac3.isover.se/files/externals/53693938bf42a8894a22ff403ae3cbff.jpg";
assert.equal(canonicalProductImageAssetKey(isoverDerivative), canonicalProductImageAssetKey(isoverOriginal));
assert.ok(generateGenericHighResolutionImageUrls(isoverDerivative).some((item) => item.url === isoverOriginal && item.strategy === "drupal_original_asset"));
assert.match(resolver, /drupal_original_asset/);
assert.match(cron, /sameAssetQualityUpgrade/);
assert.match(cron, /No page-wide image scan is performed here/);

assert.match(adminResolve, /resolveLockedProductUrlForUse/);
assert.match(adminResolve, /website_product_source_url/);
assert.match(adminCarouselRegenerate, /exactly five complete products/);
assert.match(adminCarouselRegenerate, /resolveLockedProductUrlForUse/);
assert.match(adminSingleRegenerate, /generateWebsiteItemAdImage/);
assert.match(adminSingleRegenerate, /generateAnimatedProductVideo/);
assert.match(adminSingleRegenerate, /generateLockedProductPostContentForUse/);
assert.match(adminSingleRegenerate, /renderCarouselProductSlideImage/);
assert.match(adminSingleRegenerate, /resolveLockedProductUrlForUse/);

for (const token of [
  "admin-review-lightbox",
  "admin-review-quality-strip",
  "admin-review-actionbar",
  "admin.approvals.replaceProductUrl",
  "admin.approvals.regenerateCarousel",
  "admin.approvals.regenerateProduct",
  "admin.approvals.saveChanges",
  "/api/admin/post-approvals/resolve-product",
  "/api/admin/post-approvals/regenerate-product",
]) {
  assert.ok(adminPage.includes(token), `admin review workspace must include ${token}`);
}
for (const selector of [
  ".admin-review-lightbox",
  ".admin-review-quality-strip",
  ".admin-review-actionbar",
  ".admin-review-product-grid",
  ".admin-review-single-product-editor",
]) {
  assert.ok(css.includes(selector), `admin review CSS must include ${selector}`);
}

assert.match(cron, /Product brand eyebrow, with exact spelling/);
assert.match(cron, /product brand was supplied above, include exactly that brand name/);
assert.match(cron, /product_identifier: String\(slideProduct/);
assert.match(cron, /product_image_width: Number\(slideProduct/);

console.log("v143.67 unified product pipeline, varied ad layouts, image quality and admin review workspace tests passed.");
