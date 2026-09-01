import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/79-v144-81-studio-precision-polish.css", "utf8");
const page = fs.readFileSync("app/automation/page.jsx", "utf8");
const billing = fs.readFileSync("components/StripeBillingPanel.jsx", "utf8");

assert.ok(globals.includes('@import "./styles/79-v144-81-studio-precision-polish.css";'), "v144.81 stylesheet must remain loaded");

// Planned post tone is propagated to the row so destination background can match the left rail.
assert.match(page, /plan-v14481-tone-\$\{\(index % 4\) \+ 1\}/);
for (const tone of [1, 2, 3, 4]) {
  assert.match(css, new RegExp(`plan-v14481-tone-${tone} \\.plan-v70-planned-channel`));
}
assert.match(css, /plan-v14481-tone-2[\s\S]*#eaf8f7/);
assert.match(css, /plan-v14481-tone-3[\s\S]*#fff1e6/);
assert.match(css, /plan-v14481-tone-4[\s\S]*#faeaf7/);

// Mobile settings use orange accents, six calm rows and plain aligned values rather than pills.
assert.match(css, /plan-v90-setting-icon[\s\S]*color: #f25b3d !important/);
assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(105px, auto\)/);
assert.match(css, /min-height: 66px !important/);
assert.match(css, /plan-v14473-mobile-value[\s\S]*border: 0 !important[\s\S]*background: transparent !important/);
assert.match(css, /plan-v14473-mobile-value svg[\s\S]*color: #f25b3d !important/);
assert.match(css, /custom-picker-button > span[\s\S]*font-size: 12\.5px !important/);

// Weekly timeline is readable and semantic by count, not weekday position.
assert.match(css, /plan-v14457-week-rhythm-head strong[\s\S]*font-size: 16px !important/);
assert.match(css, /plan-v14457-week-day::before[\s\S]*width: 20px !important[\s\S]*height: 20px !important/);
assert.match(css, /plan-v14457-week-day > span[\s\S]*font-size: 14px !important/);
assert.match(css, /selected:not\(\.double\)[\s\S]*color: #6f4cf3 !important/);
assert.match(css, /plan-v14457-week-day\.double[\s\S]*color: #ed4d2f !important/);
assert.doesNotMatch(css, /selected:nth-child/);

// Keep v144.78 package values and uncapped credit model intact.
assert.match(billing, /credits: 150/);
assert.match(billing, /credits: 450/);
assert.match(billing, /credits: 1000/);
assert.match(billing, /brands: 2, socialAccounts: 5, recurringPlans: 3/);
assert.match(billing, /brands: 5, socialAccounts: null, recurringPlans: 8/);

console.log("v144.81 studio precision polish checks passed");
