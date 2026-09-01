import fs from 'node:fs';

const globals = fs.readFileSync('app/globals.css', 'utf8');
const css = fs.readFileSync('app/styles/87-v144-89-activation-cta.css', 'utf8');

function ok(condition, message) {
  if (!condition) throw new Error(message);
}

ok(globals.includes('@import "./styles/87-v144-89-activation-cta.css";'), 'v144.89 stylesheet is not imported');
ok(css.includes('.plan-v70-activate-card:not(.saved)'), 'CTA selector must be scoped to the unsaved activation card');
ok(css.includes('.plan-v70-activate-actions > button'), 'Primary activation button selector missing');
ok(css.includes('#ff6a4d') && css.includes('#f04f32'), 'Spreelo coral/orange gradient missing');
ok(css.includes('color: #fff'), 'CTA must retain white text');
ok(!css.includes('.plan-v70-success-actions'), 'Success-state actions must not be recolored');
ok(!css.includes('@media'), 'CTA patch should not alter responsive layout');

console.log('v144.89 activation CTA checks passed');
