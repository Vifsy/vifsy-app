import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { haveProductTitlesIdentityAgreement } from "../lib/productEngineV2.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

assert.equal(
  haveProductTitlesIdentityAgreement(
    "Kipling 100 PENS BTS - Pennfodral - true black",
    "Kipling CLASS ROOM BTS - Skolväska - black khaki block"
  ),
  false,
  "shared brand/BTS/colour words must not merge a pencil case with a backpack"
);

assert.equal(
  haveProductTitlesIdentityAgreement(
    "Kipling 100 PENS BTS",
    "Kipling 100 PENS BTS - Pennfodral - true black"
  ),
  true,
  "the same model may keep retailer category/colour suffixes"
);

assert.equal(
  haveProductTitlesIdentityAgreement(
    "Nike Air Max 90 black",
    "Nike Air Max 95 black"
  ),
  false,
  "conflicting numeric model identifiers must fail closed"
);

assert.equal(
  haveProductTitlesIdentityAgreement(
    "Salomon Sportstyle XT-6 sneakers",
    "Salomon XT-6 Sportstyle"
  ),
  true,
  "word-order changes for the same model must remain valid"
);

assert.match(
  route,
  /Authoritative product page identity mismatch blocked before image hydration/,
  "hydration must reject a product URL whose live page title is a different product"
);
assert.match(
  route,
  /initial web-research result is[\s\S]{0,180}NOT enough on its own/,
  "an initial model image URL must not be treated as same-page product proof"
);
assert.match(
  route,
  /image_source_page_url[\s\S]{0,220}image_is_main_product_asset/,
  "exact recovery must return same-page image provenance"
);
assert.match(
  route,
  /sameOpenedProductPage[\s\S]{0,700}image_is_main_product_asset !== true/,
  "exact recovery must fail closed unless the image belongs to the returned product page"
);
assert.match(
  route,
  /technical_identity_same_page_verified: true[\s\S]{0,220}product_image_page_bound: true/,
  "accepted exact recovery must persist the same-page binding"
);
assert.match(
  route,
  /Product image resolver ignored an unbound authoritative primary image/,
  "the image resolver must not use an unbound web-agent image as its identity anchor"
);
assert.match(
  route,
  /Product image resolver blocked a product URL\/title identity mismatch/,
  "the final resolver must independently guard URL/title identity"
);

const semanticStart = route.indexOf("async function reviewResolvedProductImageIdentity");
const semanticEnd = route.indexOf("async function reviewCarouselProductOnlyImages", semanticStart);
const semantic = route.slice(semanticStart, semanticEnd);
assert.match(semantic, /detail: "high"/);
assert.match(semantic, /Number\(review\.confidence \|\| 0\) >= 0\.9/);
assert.match(semantic, /pencil case vs a backpack/);

assert.match(
  route,
  /ki153i011-q11\.html/,
  "Zalando-style terminal article codes must be recognized as stable identity hints"
);

console.log("v143.61 same-page product identity regression tests passed.");
