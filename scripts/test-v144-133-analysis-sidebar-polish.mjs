import fs from 'node:fs';

const brand = fs.readFileSync('app/brand/page.jsx', 'utf8');
const css = fs.readFileSync('app/styles/115-v144-133-analysis-sidebar-polish.css', 'utf8');
const globals = fs.readFileSync('app/globals.css', 'utf8');

const checks = [
  ['progress icon is Building2', brand.includes('brand-analysis-current-icon"><Building2 size={22} />')],
  ['progress icon is no longer Sparkles', !brand.includes('brand-analysis-current-icon"><Sparkles size={22} />')],
  ['dotted connector removed', css.includes('content: none !important') && css.includes('display: none !important')],
  ['current step stays coral', css.includes('background: #ef5a39 !important')],
  ['completed check is subtle green', css.includes('span.done:not(.current) b') && css.includes('color: #25845a !important')],
  ['home/settings desktop sidebar is 276px', (css.match(/276px/g) || []).length >= 5],
  ['logo is not targeted', !css.includes('spreelo-logo')],
  ['new stylesheet is loaded last', globals.trim().endsWith('@import "./styles/115-v144-133-analysis-sidebar-polish.css";')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
