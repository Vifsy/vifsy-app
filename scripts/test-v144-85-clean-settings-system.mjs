import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/83-v144-85-clean-settings-system.css", "utf8");
const page = fs.readFileSync("app/automation/page.jsx", "utf8");
const billing = fs.readFileSync("components/StripeBillingPanel.jsx", "utf8");

assert.ok(globals.trimEnd().endsWith('@import "./styles/83-v144-85-clean-settings-system.css";'), "v144.85 clean settings stylesheet must load last");

// The previous cascade-conflicted markup is no longer used for these two components.
assert.doesNotMatch(page, /className="plan-v14467-settings-groups"/);
assert.doesNotMatch(page, /className="plan-v14457-week-rhythm plan-v14467-week-rhythm"/);
assert.match(page, /className="sp85-settings-grid"/);
assert.match(page, /className="sp85-week-rhythm"/);

// Desktop reference: three glass cards, isolated controls and compact segmented rhythm.
assert.match(css, /sp85-settings-grid[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(css, /sp85-settings-card[\s\S]*backdrop-filter: blur\(20px\)/);
assert.match(css, /@media \(min-width: 1181px\)[\s\S]*sp85-settings-card[\s\S]*rgba\(255,255,255,\.54\)/);
assert.match(css, /sp85-settings-card-rows[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /sp85-week-rhythm[\s\S]*grid-template-columns: minmax\(300px, 30%\) minmax\(0, 1fr\)/);
assert.match(css, /sp85-week-days[\s\S]*grid-template-columns: repeat\(7, minmax\(0, 1fr\)\)/);
assert.match(css, /sp85-week-day\.is-selected[\s\S]*#9a74ff[\s\S]*#6f42e9/);
assert.match(css, /sp85-week-day\.is-multi[\s\S]*#ff8064[\s\S]*#f45535/);

// Tablet does not squeeze three cards below the usable width.
assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1180px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /sp85-settings-card-channels[\s\S]*grid-column: 1 \/ -1/);

// Mobile is one deterministic six-row card with explicit order and stable columns.
assert.match(css, /@media \(max-width: 760px\)[\s\S]*sp85-settings-card,[\s\S]*sp85-settings-card-rows[\s\S]*display: contents/);
assert.match(css, /sp85-row-goal \{ order: 1/);
assert.match(css, /sp85-row-frequency \{ order: 2/);
assert.match(css, /sp85-row-date \{ order: 3/);
assert.match(css, /sp85-row-language \{ order: 4/);
assert.match(css, /sp85-row-platform \{ order: 5/);
assert.match(css, /sp85-row-publishing \{ order: 6/);
assert.match(css, /grid-template-columns: 44px minmax\(0, 1fr\) minmax\(92px, 38%\) 14px/);
assert.match(css, /sp85-week-days::before[\s\S]*left: calc\(100% \/ 14\)/);
assert.match(css, /sp85-week-day\.is-selected \.sp85-week-dot::after/);

// Existing behavior is still wired to the same state/change handlers.
assert.match(page, /changeAutoPlanGoal\(event\.target\.value\)/);
assert.match(page, /changeAutoPlanPostCount\(Number\(event\.target\.value\)\)/);
assert.match(page, /onChange=\{updatePlanStartDate\}/);
assert.match(page, /applyPlatformSelection\(nextKeys\)/);
assert.match(page, /handleWeeklyDayClick\(weekday\)/);

// Package/credit model remains untouched and uncapped.
assert.match(billing, /credits: 150/);
assert.match(billing, /credits: 450/);
assert.match(billing, /credits: 1000/);
assert.match(billing, /brands: 2, socialAccounts: 5, recurringPlans: 3/);
assert.match(billing, /brands: 5, socialAccounts: null, recurringPlans: 8/);

console.log("v144.85 clean settings system checks passed");
