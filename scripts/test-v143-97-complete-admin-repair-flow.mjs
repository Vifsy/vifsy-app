import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const babelParser = require("../node_modules/next/dist/compiled/babel/parser.js");
const read = (path) => fs.readFileSync(path, "utf8");

const page = read("app/admin/post-approvals/page.jsx");
const single = read("app/api/admin/post-approvals/regenerate-product/route.js");
const carousel = read("app/api/admin/post-approvals/regenerate/route.js");
const approvals = read("app/api/admin/post-approvals/route.js");
const upload = read("app/api/admin/post-approvals/upload/route.js");
const cron = read("app/api/cron/run-automations/route.js");

for (const file of [
  "app/admin/post-approvals/page.jsx",
  "app/api/admin/post-approvals/regenerate-product/route.js",
  "app/api/admin/post-approvals/regenerate/route.js",
]) {
  babelParser.parse(read(file), { sourceType: "module", plugins: ["jsx"] });
}

// A generation that never created a posts row must still be directly repairable.
assert.match(page, /selectedPost\.status === "failed"[\s\S]*\[emptyCarouselProduct\(\)\]/);
assert.match(page, /setManualEditingIndices\(isEmptyFailedSingle \? \[0\] : \[\]\)/);
assert.match(page, /review_case_id: selectedPost\.failure\?\.review_case_id \|\| null/);

for (const endpoint of [single, carousel]) {
  assert.match(endpoint, /body\?\.review_case_id/);
  assert.match(endpoint, /from\("admin_review_cases"\)/);
  assert.match(endpoint, /source: "automation_admin_repair"/);
  assert.match(endpoint, /approval_required: true/);
  assert.match(endpoint, /admin_review_status: "pending"/);
  assert.match(endpoint, /status: "pending_approval"/);
  assert.doesNotMatch(endpoint, /sendApprovalEmail/);
}

// Blocked stores can be repaired with authoritative admin-entered material.
assert.match(single, /Manual override requires at least a product name and product image/);
assert.match(single, /description: suppliedProduct\.description \|\| ""/);
assert.match(single, /generateLockedProductPostContentForUse/);
assert.match(carousel, /admin_materials_authoritative: true/);
assert.match(carousel, /repairUserId/);
assert.match(carousel, /reviewCase\?\.scheduled_for/);
assert.match(upload, /admin-review-assets/);

// Regression for the Intersport animated-Reel failure: commas in CDN query
// parameters are not separate srcset candidates, and the already verified
// product image is attempted before noisy gallery candidates.
assert.match(cron, /\.split\(\/,\\s\+\(\?=\\S\)\/\)/);
assert.match(cron, /candidate\.source === "selected_product_image"\) return 1000/);

// The customer email remains behind the explicit admin release action.
assert.match(approvals, /releasePostToCustomer/);
assert.match(approvals, /sendApprovalEmail/);

console.log("v143.97 complete admin repair and customer-release gate passed.");
