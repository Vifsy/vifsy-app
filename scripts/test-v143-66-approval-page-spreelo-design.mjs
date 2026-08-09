import assert from "node:assert/strict";
import fs from "node:fs";

const approveRoute = fs.readFileSync("app/api/approve-post/route.js", "utf8");
const automationRoute = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

assert.match(approveRoute, /brand\/spreelologo\.png/);
assert.match(approveRoute, /--spreelo-accent: #ef6849/);
assert.match(approveRoute, /linear-gradient\(90deg, #ff6b52 0%, #ef3e2f 46%, #8b5cf6 100%\)/);
assert.match(approveRoute, /class="primary-action"/);
assert.match(approveRoute, /class="secondary-action"/);
assert.match(approveRoute, /@media \(max-width: 560px\)/);
assert.match(approveRoute, /href="\$\{APP_URL\}"/);

const presentationStart = automationRoute.indexOf("function stripBrandPrefixFromProductTitle");
const presentationEnd = automationRoute.indexOf("async function deriveLocalPackshotLabelAnalysis", presentationStart);
assert.ok(presentationStart >= 0 && presentationEnd > presentationStart);
const presentationSource = automationRoute
  .slice(presentationStart, presentationEnd)
  .replace("export function getCarouselProductLabelPresentation", "function getCarouselProductLabelPresentation");
const getPresentation = new Function(`
  const normalizeProductBrandIdentity = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\\s+/g, " ").trim();
  ${presentationSource}
  return getCarouselProductLabelPresentation;
`)();

assert.equal(
  getPresentation({
    locked_product_title: "TEE FUTURA UNISEX - T-shirt - bas - ghost",
    locked_product_brand: "Nike Sportswear",
    product_display_type: "T-shirt - bas",
  }).descriptor,
  "T-shirt - bas · ghost",
  "descriptor must not duplicate an adjective already present in the verified product type"
);

console.log("v143.66 Spreelo approval page + concise descriptor tests passed.");
