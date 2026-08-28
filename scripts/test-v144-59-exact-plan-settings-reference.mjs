import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const globals = read('app/globals.css');
const css = read('app/styles/59-v144-59-exact-plan-settings-reference.css');
const automation = read('app/automation/page.jsx');

expect(globals.trimEnd().endsWith('@import "./styles/59-v144-59-exact-plan-settings-reference.css";'), 'v144.59 exact-reference CSS is the final cascade layer');
expect(css.includes('min-height:53px !important') && css.includes('grid-template-columns:minmax(0,1fr) auto !important'), 'mobile/tablet setting rows use the compact one-row 4810 geometry');
expect(css.includes('background:transparent !important') && css.includes('border-radius:0 !important') && css.includes('appearance:none !important'), 'setting values are plain right-aligned row values rather than boxed controls');
expect(css.includes('.plan-v14459-platform-setting-row .platform-multiselect.open') && css.includes('display:contents !important'), 'expanded platform selector stays inside the unified settings card');
expect(css.includes('.platform-multiselect-option:has(input:checked)') && css.includes('content:"✓" !important'), 'selected platform has the orange reference border/check indicator');
expect(css.includes('.plan-v14341-date-tile::after') && css.includes('border-right:2px solid #132039'), 'start-date row has the separate compact chevron from the reference');
expect(automation.includes('plan-v14459-platform-value') && automation.includes('plan-v14459-platform-menu-label'), 'platform row exposes reference-style text value and inline channel chooser');
expect(automation.indexOf('plan-v14459-platform-setting-row') < automation.indexOf('plan-v14459-publishing-setting-row'), 'settings order matches 4810: Platform before Publishing');
expect(automation.includes('<span className="plan-v90-setting-icon"><Send size={20}') && automation.includes('<span className="plan-v90-setting-icon"><Clock3 size={20}'), 'Platform uses paper-plane icon and Publishing uses clock icon as in 4810');
expect(!automation.includes('<LayoutGrid size={20} aria-hidden="true" />'), 'old grid icon is removed from the plan Platform row');

console.log(`v144.59 QA passed (${checks.length} checks).`);
