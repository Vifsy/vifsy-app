import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/84-v144-86-targeted-ui-corrections.css", "utf8");
const page = fs.readFileSync("app/automation/page.jsx", "utf8");
const billing = fs.readFileSync("components/StripeBillingPanel.jsx", "utf8");

assert.ok(globals.trimEnd().endsWith('@import "./styles/84-v144-86-targeted-ui-corrections.css";'), "v144.86 stylesheet must be the final active layer");
assert.doesNotMatch(globals, /@import "\.\/styles\/83-v144-85-clean-settings-system\.css";/, "v144.85 settings layer must be replaced, not stacked");

// Platform picker must stay open when its own button is clicked.
assert.match(page, /!event\.target\.closest\("\.platform-multiselect"\) && !event\.target\.closest\("\.sp85-platform-picker"\)/);
assert.match(page, /className="sp85-platform-button"[\s\S]*event\.stopPropagation\(\);[\s\S]*setPlatformDropdownOpen/);
assert.match(page, /applyPlatformSelection\(nextKeys\)/);

// Desktop/tablet glass + rounded cards and calmer controls.
assert.match(css, /sp85-settings-card[\s\S]*border-radius: 24px !important[\s\S]*rgba\(255,255,255,\.34\)[\s\S]*backdrop-filter: blur\(18px\) saturate\(126%\) !important/);
assert.match(css, /sp85-select-control,[\s\S]*height: 46px !important/);
assert.match(css, /sp85-value-display > strong,[\s\S]*font-weight: 600 !important/);
assert.match(css, /sp85-week-day\.is-selected > span,[\s\S]*color: #fff !important/);

// Mobile settings are consistent and the date is not a special pill.
assert.match(css, /@media \(max-width: 760px\)[\s\S]*sp85-settings-grid,[\s\S]*width: 100% !important[\s\S]*margin-left: 0 !important/);
assert.match(css, /sp85-settings-row[\s\S]*border-top: 1px solid rgba\(181,195,216,\.46\) !important/);
assert.match(css, /sp85-row-goal[\s\S]*border-top: 0 !important/);
assert.match(css, /sp85-row-copy > small[\s\S]*font-size: 11\.5px !important/);
assert.match(css, /sp85-date-control[\s\S]*border: 0 !important[\s\S]*background: transparent !important/);
assert.match(css, /sp85-date-control \.custom-picker-button[\s\S]*border-radius: 0 !important[\s\S]*justify-content: flex-end !important/);
assert.match(css, /sp85-date-control \.custom-calendar-popover[\s\S]*width: min\(330px, calc\(100vw - 32px\)\) !important/);
assert.match(css, /plan-v70-settings-card\.plan-v84-settings-card\.plan-v89-settings-section[\s\S]*padding-left: 0 !important[\s\S]*padding-right: 0 !important/);

// Planned-post expansion has no outer tray and the colored rail continues.
assert.match(css, /plan-v70-planned-row\.expanded \.plan-v86-planned-visual[\s\S]*grid-row: 1 \/ 5 !important/);
assert.match(css, /plan-v70-planned-row\.expanded \.plan-v70-row-editor[\s\S]*grid-column: 2 !important[\s\S]*border: 0 !important[\s\S]*border-radius: 0 !important/);
assert.match(css, /plan-v14481-tone-1\.expanded \.plan-v70-row-editor[\s\S]*#f3efff/);
assert.match(css, /plan-v74-channel-chip[\s\S]*background: transparent !important[\s\S]*box-shadow: none !important/);

// Billing/package truth remains untouched and uncapped.
assert.match(billing, /credits: 150/);
assert.match(billing, /credits: 450/);
assert.match(billing, /credits: 1000/);
assert.match(billing, /brands: 2, socialAccounts: 5, recurringPlans: 3/);
assert.match(billing, /brands: 5, socialAccounts: null, recurringPlans: 8/);

console.log("v144.86 targeted UI corrections checks passed");
