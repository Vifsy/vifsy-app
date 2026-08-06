import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [automation, approvalsApi, css, globals] = await Promise.all([
  read("app/automation/page.jsx"),
  read("app/api/admin/post-approvals/route.js"),
  read("app/styles/47-v143-34-regression-recovery.css"),
  read("app/globals.css"),
]);

assert.match(automation, /\{!campaignOpportunity \? \(\s*<section className="plan-v70-shell">/);
assert.match(automation, /plan-v143-date-time-row[\s\S]*DatePickerField[\s\S]*plan-v143-timezone-inline/);
assert.match(approvalsApi, /slide\?\.metadata\?\.product_description[\s\S]*slide\?\.metadata\?\.product_title/);
assert.match(approvalsApi, /Math\.max\(slideProducts\.length, storedProducts\.length\)/);
assert.match(css, /campaign-planner-clean \.wizard-main>\.planner-hero-final\{display:grid!important\}/);
assert.match(css, /\.social-v74-card\{[^}]*border-radius:28px!important/);
assert.match(css, /\.brand-profile-page \.brand-profile-summary-card\{[^}]*border-radius:24px!important/);
assert.match(css, /\.dashboard-page \.dashboard-card[\s\S]*border-radius:28px!important/);
assert.match(css, /\.plan-v70-activate-copy h2\{[^}]*font-size:21px!important/);
assert.match(css, /\.plan-v70-planned-row\{[^}]*grid-template-columns:48px minmax\(0,1fr\) 32px!important/);
assert.match(globals, /47-v143-34-regression-recovery\.css/);

console.log("v143.34 campaign restoration, carousel preservation and responsive design checks passed.");
