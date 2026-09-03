import fs from 'node:fs';

const css = fs.readFileSync('app/styles/90-v144-94-home-desktop-plan-actions.css', 'utf8');
const globals = fs.readFileSync('app/globals.css', 'utf8');
const mobile = fs.readFileSync('app/styles/89-v144-93-home-mobile-reference.css', 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(globals.includes('@import "./styles/90-v144-94-home-desktop-plan-actions.css";'), 'v144.94 desktop polish must be imported');
expect(css.includes('@media (min-width:1451px)'), 'desktop fix must be scoped to wide desktop');
expect(css.includes('grid-template-columns:48px minmax(0,1fr) 118px 154px !important;'), 'plan row must reserve dedicated status/action columns');
expect(css.includes('white-space:nowrap !important;'), 'status/action labels must not wrap');
expect(css.includes('justify-self:end !important;'), 'right-side controls must align to the right');
expect(css.includes('font-size:12px !important;'), 'empty status typography must be compact');
expect(mobile.includes('@media (max-width:600px)'), 'v144.93 mobile scope must remain intact');
expect(mobile.includes('article > strong {\n    display:none !important;'), 'mobile must continue hiding the status column');

console.log('v144.94 desktop Content plans alignment checks passed');
