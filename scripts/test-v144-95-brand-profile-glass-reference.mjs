import fs from 'node:fs';

const page = fs.readFileSync('app/brand/page.jsx', 'utf8');
const css = fs.readFileSync('app/styles/91-v144-95-brand-profile-glass-reference.css', 'utf8');
const globals = fs.readFileSync('app/globals.css', 'utf8');
const homeMobile = fs.readFileSync('app/styles/89-v144-93-home-mobile-reference.css', 'utf8');
const homeDesktop = fs.readFileSync('app/styles/90-v144-94-home-desktop-plan-actions.css', 'utf8');
const cron = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

expect(globals.includes('@import "./styles/91-v144-95-brand-profile-glass-reference.css";'), 'v144.95 profile stylesheet must be imported last');
expect(page.includes('brand-profile-page brand-v14495-page'), 'brand page must expose isolated v144.95 namespace');
expect(page.includes('brand-v14495-hero-art'), 'brand hero must include the new integrated illustration hook');
expect(page.includes('brand-v14495-profile-strip'), 'brand overview must use the compact glass profile strip');
expect(page.includes('brand-v14495-summary-list'), 'brand settings must use the compact row list');
expect(page.includes('brand-v14495-summary-row'), 'brand settings rows must use the isolated row hook');
expect(page.includes('brand-v14495-danger'), 'danger zone must stay separately scoped');
expect(css.includes('spreelo-plan-reference-magic-v95.svg'), 'brand page must reuse AI Studio magic background');
expect(css.includes('spreelo-brand-intelligence-v143-38.png'), 'desktop brand hero must use the existing brand intelligence art');
expect(css.includes('backdrop-filter: blur(19px)'), 'brand settings surfaces must keep the frosted glass treatment');
expect(css.includes('grid-template-columns: 46px 260px minmax(0, 1fr) 22px'), 'desktop profile rows must use stable icon/label/value/chevron columns');
expect(css.includes('@media (max-width: 760px)'), 'brand profile must retain a dedicated mobile layout');
expect(homeMobile.includes('@media (max-width:600px)'), 'v144.93 Home mobile reference must remain intact');
expect(homeDesktop.includes('@media (min-width:1451px)'), 'v144.94 Home desktop action fix must remain intact');
expect(!cron.includes('normalizeUrlForComparison('), 'v144.92 product research ReferenceError fix must remain intact');

console.log('v144.95 brand profile glass/reference checks passed');
