import fs from 'node:fs';

const globals = fs.readFileSync('app/globals.css', 'utf8');
const css = fs.readFileSync('app/styles/86-v144-88-responsive-bridge.css', 'utf8');

function expect(value, message) {
  if (!value) throw new Error(message);
}

const oldImport = '@import "./styles/85-v144-87-glass-mobile-spacing.css";';
const newImport = '@import "./styles/86-v144-88-responsive-bridge.css";';
expect(globals.includes(newImport), 'v144.88 responsive bridge import missing');
expect(globals.indexOf(newImport) > globals.indexOf(oldImport), 'v144.88 bridge must load after v144.87');
expect(css.includes('@media (min-width: 761px)'), 'bridge must be isolated away from approved mobile');
expect(css.includes('container-type: inline-size'), 'settings section must use actual available width');
expect(css.includes('container-name: sp85-settings-area'), 'named settings container missing');
expect(css.includes('@container sp85-settings-area (max-width: 899px)'), 'compact intermediate range missing');
expect(css.includes('@container sp85-settings-area (min-width: 900px) and (max-width: 1279px)'), 'medium intermediate range missing');
expect(css.includes('display: contents'), 'compact six-row bridge missing');
expect(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'medium 2+1 grid missing');
expect(css.includes('grid-column: 1 / -1'), 'channels full-width medium card missing');
expect(css.includes('grid-template-columns: 1fr'), 'week rhythm stacked intermediate mode missing');
expect(!css.includes('@media (max-width: 760px)'), 'v144.88 must not override approved mobile');
expect(!css.includes('@container sp85-settings-area (min-width: 1280px)'), 'v144.88 must not override approved wide desktop');

console.log('v144.88 responsive bridge checks passed');
