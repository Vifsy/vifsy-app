import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (p) => fs.readFileSync(p, 'utf8');
const settings = read('app/settings/page.jsx');
const automation = read('app/automation/page.jsx');
const css = read('app/styles/41-v143-80-settings-studio-correction.css');
const globals = read('app/globals.css');

assert.ok(settings.includes('settings-v14380-page'), 'Settings page must opt into v143.80 layout');
assert.ok(css.includes('.settings-v14380-page {') && css.includes('display: flex !important'), 'Settings parent must override historical two-column grid');
assert.ok(css.includes('.settings-v14380-page .stripe-billing-v14377') && css.includes('width: 100% !important'), 'Billing must be a full-width row');
assert.ok(css.includes('grid-template-columns: minmax(460px, .92fr) minmax(560px, 1.08fr)'), 'Desktop overview must preserve hero + quick cards composition');
assert.ok(automation.includes('plan-v14380-polish'), 'AI Studio must opt into v143.80 correction');
assert.ok(automation.includes('plan-v14380-platform-note'), 'Platform compatibility note must be moved out of the settings tile');
assert.ok(!automation.includes('className="plan-v14349-platform-adapter-note"'), 'Old overflowing in-tile platform note must be removed');
assert.ok(css.includes('width: calc(100% - 14px) !important'), 'Mobile studio must use more of the viewport width');
assert.ok(css.includes('min-height: 116px !important'), 'Mobile setting tiles must have enough height for helper text and controls');
assert.ok(css.includes('font-size: 11px !important') && css.includes('.plan-v14380-platform-note'), 'Platform note must be compact/readable on mobile');
assert.ok(globals.trim().endsWith('@import "./styles/41-v143-80-settings-studio-correction.css";'), 'v143.80 correction CSS must load last');

console.log('v143.80 settings/studio correction assertions passed');
