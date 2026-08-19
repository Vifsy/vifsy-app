import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const babelParser = require("../node_modules/next/dist/compiled/babel/parser.js");

const read = (path) => fs.readFileSync(path, "utf8");
const cron = read("app/api/cron/run-automations/route.js");
const digest = read("app/api/cron/admin-review-digest/route.js");
const adminPage = read("app/admin/post-approvals/page.jsx");
const adminCss = read("app/styles/38-current-experience-v143.css");
const migration = read("supabase/v143_96_mandatory_admin_review.sql");

for (const file of [
  "app/api/cron/run-automations/route.js",
  "app/api/cron/admin-review-digest/route.js",
  "app/admin/post-approvals/page.jsx",
]) {
  babelParser.parse(read(file), { sourceType: "module", plugins: ["jsx"] });
}

assert.match(cron, /getConfiguredAdminEmails/);
assert.match(digest, /getConfiguredAdminEmails/);
assert.match(cron, /typeof brand\?\.admin_review_required === "boolean"/);
assert.match(cron, /return data\?\.require_admin_post_approval !== false/);
assert.match(migration, /require_admin_post_approval\)\s*\nvalues \('global', true\)/);
assert.match(migration, /set admin_review_required = true/);
assert.match(read("app/api/admin/post-approvals/route.js"), /Boolean\(body\?\.admin_review_required\)/);
assert.match(adminPage, /setBrandPolicy\(false\)/);
assert.match(cron, /Products available for internal review/);
assert.match(cron, /Open product source/);
assert.match(adminPage, /admin-product-original-link/);
assert.match(adminPage, /target="_blank" rel="noreferrer"/);
assert.match(adminCss, /\.admin-product-original-link[\s\S]*background: #0b1e30/);

console.log("v143.96 review alerts/product links remain compatible with v144.01 policy override.");
