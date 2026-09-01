import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/81-v144-83-plan-settings-week-rhythm-correction.css", "utf8");
const page = fs.readFileSync("app/automation/page.jsx", "utf8");

assert.ok(globals.trimEnd().endsWith('@import "./styles/81-v144-83-plan-settings-week-rhythm-correction.css";'), "v144.83 correction must load last");
assert.ok(!globals.includes('@import "./styles/80-v144-82-exact-settings-week-reference.css";'), "v144.82 all-breakpoint flattening must be removed from active cascade");

// v144.83 deliberately does not restyle desktop settings; v144.81 desktop remains authoritative.
const mobileStart = css.indexOf('@media (max-width: 760px)');
assert.ok(mobileStart >= 0, "mobile settings override exists");
const beforeMobile = css.slice(0, mobileStart);
assert.ok(!beforeMobile.includes('plan-v14467-settings-groups'), "desktop settings are not overridden in v144.83");

// Mobile remains the straight six-row reference pattern.
assert.match(css, /@media \(max-width: 760px\)[\s\S]*plan-v14467-settings-group,[\s\S]*plan-v14467-settings-rows[\s\S]*display: contents !important/);
assert.match(css, /plan-v14473-goal-tile \{ order: 1 !important; \}/);
assert.match(css, /plan-v14459-publishing-tile \{ order: 6 !important; \}/);
assert.match(css, /plan-v90-setting-tile,[\s\S]*height: 72px !important/);
assert.match(css, /plan-v90-setting-title[\s\S]*font-size: 15px !important/);
assert.match(css, /plan-v90-setting-icon[\s\S]*color: #f25b3d !important/);

// Week rhythm is bounded and uses a single continuous connector.
assert.match(css, /plan-v14467-week-rhythm[\s\S]*max-width: 900px !important/);
assert.match(css, /plan-v14457-week-days::before[\s\S]*left: calc\(100% \/ 14\) !important[\s\S]*right: calc\(100% \/ 14\) !important/);
assert.match(css, /plan-v14457-week-day::after[\s\S]*display: none !important/);
assert.match(css, /selected:not\(\.double\)[\s\S]*color: #6840f4 !important/);
assert.match(css, /plan-v14457-week-day\.double[\s\S]*color: #f04d2f !important/);

// Behavior stays untouched.
assert.match(page, /handleWeeklyDayClick\(weekday\)/);
assert.match(page, /changeAutoPlanGoal/);
assert.match(page, /changeAutoPlanPostCount/);
assert.match(page, /updatePlanStartDate/);
assert.match(page, /applyPlatformSelection/);

console.log("v144.83 plan settings + weekly rhythm correction checks passed");
