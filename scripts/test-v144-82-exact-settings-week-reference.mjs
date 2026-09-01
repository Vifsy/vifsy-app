import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/80-v144-82-exact-settings-week-reference.css", "utf8");
const page = fs.readFileSync("app/automation/page.jsx", "utf8");

assert.ok(fs.existsSync('app/styles/80-v144-82-exact-settings-week-reference.css'), 'v144.82 stylesheet remains archived in source');

// One unified six-row settings card, in the exact visual order from the reference.
assert.match(css, /plan-v14467-settings-group,[\s\S]*plan-v14467-settings-rows[\s\S]*display: contents !important/);
assert.match(css, /plan-v14467-group-title[\s\S]*display: none !important/);
assert.match(css, /plan-v14473-goal-tile \{ order: 1 !important; \}/);
assert.match(css, /plan-v14473-frequency-tile \{ order: 2 !important; \}/);
assert.match(css, /plan-v14341-date-tile \{ order: 3 !important; \}/);
assert.match(css, /plan-v14473-language-tile \{ order: 4 !important; \}/);
assert.match(css, /plan-v14459-platform-tile \{ order: 5 !important; \}/);
assert.match(css, /plan-v14459-publishing-tile \{ order: 6 !important; \}/);
assert.match(css, /plan-v14467-settings-groups[\s\S]*border-radius: 22px !important/);
assert.match(css, /plan-v90-setting-title[\s\S]*font-size: 17px !important/);
assert.match(css, /plan-v90-setting-copy small[\s\S]*font-size: 13px !important/);
assert.match(css, /plan-v90-setting-icon[\s\S]*color: #ff5436 !important/);
assert.match(css, /plan-v14473-mobile-value[\s\S]*background: transparent !important/);

// Weekly axis: bounded desktop width, one continuous line, readable circles/text.
assert.match(css, /plan-v14467-week-rhythm[\s\S]*max-width: 1120px !important/);
assert.match(css, /plan-v14457-week-days::before[\s\S]*display: block !important[\s\S]*left: calc\(100% \/ 14\) !important[\s\S]*right: calc\(100% \/ 14\) !important/);
assert.match(css, /plan-v14457-week-day::before[\s\S]*width: 28px !important[\s\S]*height: 28px !important/);
assert.match(css, /plan-v14457-week-day > span[\s\S]*font-size: 15px !important/);
assert.match(css, /selected:not\(\.double\)[\s\S]*color: #6840f4 !important/);
assert.match(css, /plan-v14457-week-day\.double[\s\S]*color: #f04d2f !important/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*plan-v14457-week-days::before[\s\S]*height: 1\.5px !important/);

// Component behavior remains intact; this release is visual only.
assert.match(page, /handleWeeklyDayClick\(weekday\)/);
assert.match(page, /changeAutoPlanGoal/);
assert.match(page, /changeAutoPlanPostCount/);
assert.match(page, /updatePlanStartDate/);
assert.match(page, /applyPlatformSelection/);

console.log("v144.82 exact settings + weekly reference checks passed");
