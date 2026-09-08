import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const regen = fs.readFileSync(
  path.join(root, "app/api/admin/post-approvals/regenerate-product/route.js"),
  "utf8"
);
const automation = fs.readFileSync(
  path.join(root, "app/automation/page.jsx"),
  "utf8"
);
const labels = fs.readFileSync(
  path.join(root, "lib/i18n/defaultLabels.js"),
  "utf8"
);
const mass = fs.readFileSync(
  path.join(root, "lib/adminMassTest.js"),
  "utf8"
);

assert.match(
  route,
  /export async function generateWebsiteItemEditorialPostImage\(openai, rule, postContent\)/
);
assert.match(route, /function isWebsiteProductPostRule\(rule\)/);
assert.match(route, /size:\s*"1024x1280"/);
assert.match(route, /quality:\s*"medium"/);
assert.match(route, /PRODUCT FIDELITY MODE — NATIVE TRANSPARENT ORIGINAL/);
assert.match(route, /PRODUCT FIDELITY MODE — SOURCE IMAGE HAS NO USABLE TRANSPARENCY/);
assert.match(route, /No CTA button/);
assert.match(route, /Mobile readability is mandatory/);
assert.match(route, /campaignScoped:\s*isCampaignScopedWebsiteRule\(rule\)/);
assert.match(route, /mask:\s*maskFile/);
assert.match(
  route,
  /composite\(\[\{\s*input:\s*nativeReference\.lockedProductBuffer/
);

const editorialStart = route.indexOf(
  "export async function generateWebsiteItemEditorialPostImage"
);
const nextFunction = route.indexOf(
  "function websiteTextContainsAny",
  editorialStart
);
const editorialBlock = route.slice(
  editorialStart,
  nextFunction > editorialStart ? nextFunction : undefined
);
assert.ok(editorialBlock.length > 0, "Editorial generator block missing");
assert.doesNotMatch(
  editorialBlock,
  /createGptImageProductTransparentCutout|extractStrictTransparentProductCutout/
);
assert.match(editorialBlock, /prepareNativeTransparentEditorialReference/);
assert.match(editorialBlock, /high_fidelity_recreation/);
assert.match(editorialBlock, /native_transparent_locked_original/);

assert.match(
  route,
  /isWebsiteProductPostRule\(ruleWithBrandProfile\)[\s\S]{0,1500}generateWebsiteItemEditorialPostImage/
);
assert.match(
  route,
  /campaignScoped:\s*isCampaignScopedWebsiteRule\(ruleWithBrandProfile\)/
);
assert.match(
  route,
  /preserving verified original website image/
);

assert.match(regen, /generateWebsiteItemEditorialPostImage/);
assert.match(regen, /isEditorialProductPost/);
assert.match(regen, /admin-product-editorial/);

assert.match(automation, /premium 4:5 editorial product post/);
assert.match(automation, /skip background-removal attempts/);
assert.match(labels, /premium 4:5 editorial product image/);
assert.match(mass, /skip cutout\/background-removal attempts/);

console.log("v144.135 editorial Product post checks passed");
