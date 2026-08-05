import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

const progress = read("lib/analysisProgress.js");
const onboarding = read("app/onboarding/page.jsx");
const brand = read("app/brand/page.jsx");
const layout = read("components/AppLayout.jsx");
const cron = read("app/api/cron/run-automations/route.js");
const approvals = read("app/admin/post-approvals/page.jsx");
const approvalsApi = read("app/api/admin/post-approvals/route.js");
const migration = read("supabase/v143_28_admin_review_gate.sql");

assert.match(progress, /4 \* 60 \* 1000/);
assert.match(progress, /ANALYSIS_VISUAL_MAX_PROGRESS = 99/);
assert.match(onboarding, /getSmoothAnalysisProgress/);
assert.doesNotMatch(onboarding, /Jag har ingen webbplats/);
assert.match(brand, /getSmoothAnalysisProgress/);
assert.doesNotMatch(brand, /Jag har ingen webbplats/);

assert.match(layout, /inputMode="url"/);
assert.match(layout, /normalizeBrandWebsite/);
assert.match(layout, /getBusinessNameFromWebsite/);

assert.match(cron, /getAdminPostReviewGate/);
assert.match(cron, /admin_review_status: adminPostReviewRequired \? "pending" : "not_required"/);
assert.match(cron, /productTitle: trustedProductTitle/);
assert.match(cron, /getProductLabelEyebrow/);
assert.match(cron, /no customer failure email sent/i);

assert.match(approvals, /post\.slides\?\.length/);
assert.match(approvals, /release_to_customer/);
assert.match(approvals, /JSON\.stringify\(selectedPost\.failure/);
assert.match(approvalsApi, /status: "failed"/);
assert.match(approvalsApi, /releasePostToCustomer/);
assert.match(migration, /require_admin_post_approval boolean/);
assert.match(migration, /admin_review_status text/);

console.log("v143.28 brand, review gate, progress and product label checks passed.");
