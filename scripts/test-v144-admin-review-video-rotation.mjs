import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const route = read("app/api/cron/run-automations/route.js");
const shotstack = read("lib/shotstack.js");
const reviewLib = read("lib/adminPostReview.js");
const adminApi = read("app/api/admin/post-approvals/route.js");
const adminPage = read("app/admin/post-approvals/page.jsx");
const sql = read("supabase/v144_admin_post_review_gate.sql");

const animatedSelector = route.slice(
  route.indexOf("async function selectAnimatedProductImage"),
  route.indexOf("async function prepareAnimatedReelProductCandidates")
);

assert.match(
  route,
  /const verifiedProductPath = isLikelyProductDetailUrl\(resolvedUrl\)/
);
assert.match(route, /if \(url\.search && !hasProductPath\)/);
assert.ok(
  route.indexOf("const jsonLdImage = getProductImageFromJsonLd(product, pageUrl)") <
    route.indexOf("selectMostLikelyMainProductGalleryImage(galleryCandidates)"),
  "JSON-LD product image must be considered before broad gallery candidates"
);

assert.match(
  animatedSelector,
  /websiteItem\?\.image_url/
);
assert.doesNotMatch(
  animatedSelector,
  /fetchHtml\(websiteItem\.url\)/,
  "Animated video must not rescan retailer galleries after image verification"
);
assert.match(animatedSelector, /verified_product_image_frame/);
assert.match(route, /maximumCandidates = 1/);
assert.match(route, /reserveItems: \[\]/);
assert.match(shotstack, /maxAttempts = 45/);

assert.match(sql, /review_gate_enabled boolean not null default false/);
assert.match(sql, /create table if not exists public\.admin_post_reviews/);
assert.match(sql, /admin_product_override_urls jsonb/);
assert.match(reviewLib, /Never silently withhold a customer email/);
assert.match(route, /effectivePostStatus === "pending_approval" && !adminReviewHeld/);
assert.match(route, /admin_review_rerun_no_charge/);
assert.match(route, /suppressed_admin_review_rerun/);

for (const action of ["update_settings", "approve", "reject", "regenerate"]) {
  assert.ok(adminApi.includes(`"${action}"`), `Missing admin action ${action}`);
}
assert.match(adminApi, /Alla produktlänkar måste tillhöra kundens webbplats/);
assert.match(adminApi, /admin_review_no_charge: true/);
assert.match(adminPage, /Godkänn och skicka till kund/);
assert.match(adminPage, /Skapa ny version/);
assert.match(adminPage, /FÖREGÅENDE VERSION/);

console.log("v144 admin review, video identity and carousel URL safety checks passed.");
