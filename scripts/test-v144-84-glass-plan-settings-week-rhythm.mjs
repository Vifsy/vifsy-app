import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/82-v144-84-glass-plan-settings-week-rhythm.css", "utf8");
const page = fs.readFileSync("app/automation/page.jsx", "utf8");

assert.ok(globals.trimEnd().endsWith('@import "./styles/82-v144-84-glass-plan-settings-week-rhythm.css";'), "v144.84 must load last");

// Desktop reference: three grouped settings cards, glass surfaces and two-row cards.
assert.match(css, /@media \(min-width: 761px\)[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\) !important/);
assert.match(css, /plan-v14467-settings-group[\s\S]*backdrop-filter: blur\(22px\)/);
assert.match(css, /plan-v14467-settings-group[\s\S]*min-height: 230px !important/);
assert.match(css, /plan-v90-setting-tile,[\s\S]*height: 82px !important/);
assert.match(css, /plan-v14467-group-title[\s\S]*letter-spacing: \.12em !important/);

// Tablet keeps the glass family and reflows safely.
assert.match(css, /@media \(min-width: 761px\) and \(max-width: 1179px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\) !important/);
assert.match(css, /nth-child\(3\)[\s\S]*grid-column: 1 \/ -1 !important/);

// Desktop rhythm is bounded and segmented rather than stretching indefinitely.
assert.match(css, /@media \(min-width: 900px\)[\s\S]*plan-v14467-week-rhythm[\s\S]*max-width: 1220px !important/);
assert.match(css, /plan-v14457-week-days[\s\S]*border-radius: 999px !important/);
assert.match(css, /selected:not\(\.double\)[\s\S]*background: linear-gradient\(180deg, var\(--v14484-purple-2\)/);
assert.match(css, /plan-v14457-week-day\.double[\s\S]*#f35738/);

// Mobile remains one deterministic six-row card and uses glass/circle rhythm language.
assert.match(css, /@media \(max-width: 760px\)[\s\S]*plan-v14467-settings-group,[\s\S]*plan-v14467-settings-rows[\s\S]*display: contents !important/);
assert.match(css, /plan-v14473-goal-tile \{ order: 1 !important; \}/);
assert.match(css, /plan-v14459-publishing-tile \{ order: 6 !important; \}/);
assert.match(css, /plan-v90-setting-tile,[\s\S]*height: 76px !important/);
assert.match(css, /plan-v14457-week-days::before[\s\S]*left: calc\(100% \/ 14\) !important/);
assert.match(css, /plan-v14457-week-day\.selected::after[\s\S]*content: "✓" !important/);

// No planner behavior changed.
assert.match(page, /changeAutoPlanGoal/);
assert.match(page, /changeAutoPlanPostCount/);
assert.match(page, /updatePlanStartDate/);
assert.match(page, /applyPlatformSelection/);
assert.match(page, /handleWeeklyDayClick\(weekday\)/);

console.log("v144.84 glass plan settings + weekly rhythm checks passed");
