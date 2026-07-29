import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const automationPage = read("app/automation/page.jsx");
const adminDashboard = read("app/admin/page.jsx");
const approvalsPage = read("app/admin/post-approvals/page.jsx");
const approvalsApi = read("app/api/admin/post-approvals/route.js");

assert.doesNotMatch(
  automationPage,
  /disabled=\{saving \|\| !hasEnoughCredits/,
  "Missing credits must explain the block through savePlan instead of making the button dead"
);
assert.match(automationPage, /plan-v144-credit-warning/);
assert.match(automationPage, /Planen kräver \{plannedCredits\} krediter/);

assert.match(adminDashboard, /\/admin\/post-approvals\?status=failed/);
assert.match(approvalsApi, /"pending_approval", "approved", "rejected", "failed"/);
assert.match(approvalsPage, /\["failed", "Misslyckade jobb"\]/);
assert.match(approvalsPage, /generation_failure/);

assert.match(approvalsPage, /admin-v144-product-toggle/);
assert.match(approvalsPage, /setKeptProductUrls/);
assert.match(
  approvalsPage,
  /Array\.from\(new Set\(\[\.\.\.keptProductUrls, \.\.\.replacementProductUrls\]\)\)/
);
assert.match(approvalsPage, /Skapa om hela inlägget med urvalet/);
assert.match(approvalsPage, /Hela\s+skapandeprocessen körs sedan om med exakt det urvalet/);

assert.match(approvalsApi, /const isFailedRecovery = action === "regenerate" && post\.status === "failed"/);
assert.match(approvalsApi, /\.upsert\(\{/);
assert.match(approvalsApi, /\{ onConflict: "post_id" \}/);
assert.match(approvalsApi, /admin_review_no_charge: true/);

console.log("v144.1 activation, failed-job recovery and exact product rerun checks passed.");
