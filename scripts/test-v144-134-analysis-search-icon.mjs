import fs from 'node:fs';

const brand = fs.readFileSync('app/brand/page.jsx', 'utf8');
const css = fs.readFileSync('app/styles/116-v144-134-analysis-search-icon.css', 'utf8');
const globals = fs.readFileSync('app/globals.css', 'utf8');

const checks = [
  ['analysis progress icon uses Search', brand.includes('brand-analysis-current-icon"><Search size={26} />')],
  ['analysis progress icon no longer uses Building2', !brand.includes('brand-analysis-current-icon"><Building2 size={22} />')],
  ['search icon has no visible box', css.includes('border: 0 !important') && css.includes('background: transparent !important') && css.includes('border-radius: 0 !important')],
  ['search icon is centered', css.includes('place-items: center !important')],
  ['v144.134 stylesheet loads last', globals.trim().endsWith('@import "./styles/116-v144-134-analysis-search-icon.css";')],
];

let failed = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed = true;
}
if (failed) process.exit(1);
