import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const route = read("app/api/cron/run-automations/route.js");

const safetyAudit = route.slice(
  route.indexOf("async function auditCleanProductOnlyImages"),
  route.indexOf("function getCornerBackgroundStats")
);
const animatedSelector = route.slice(
  route.indexOf("async function selectAnimatedProductImage"),
  route.indexOf("async function prepareAnimatedReelProductCandidates")
);
const finalProductScreen = route.slice(
  route.indexOf("if (websiteItem?.image_url) {"),
  route.indexOf("if (isAnimatedVideoRule(websitePreparedRule || rule))")
);

for (const requiredField of [
  "clean_product_only",
  "contains_human",
  "contains_animal",
  "contains_mannequin",
  "contains_lifestyle_scene",
  "matches_product",
]) {
  assert.ok(safetyAudit.includes(requiredField), `Missing safety field ${requiredField}`);
}

assert.match(safetyAudit, /When uncertain, reject it/);
assert.match(safetyAudit, /detail: "low"/);
assert.match(safetyAudit, /PRODUCT_IMAGE_SAFETY_TIMEOUT_MS/);
assert.match(safetyAudit, /No uninspected product image was used/);
assert.match(finalProductScreen, /auditCleanProductOnlyImages/);
assert.match(finalProductScreen, /safeProductItems/);
assert.match(finalProductScreen, /NO_CLEAN_PRODUCT_ONLY_IMAGE/);

assert.match(animatedSelector, /createNonDestructiveAnimatedProductFrame/);
assert.match(animatedSelector, /verified_clean_product_frame/);
assert.match(animatedSelector, /backgroundRemovalSkipped: true/);
assert.doesNotMatch(
  animatedSelector,
  /prepared = await prepareAnimatedProductCutout\(sourceImageBuffer\)/,
  "An opaque image must not directly use the old destructive cutout result"
);

assert.match(
  route,
  /Do not add people, faces, hands, other body parts, animals, mannequins or lifestyle models/
);
assert.match(route, /no_clean_product_only_image/);

console.log("v144.2 clean product-only image and non-destructive animation checks passed.");
