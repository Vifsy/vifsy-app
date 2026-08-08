import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const globals = read('app/globals.css');
const page = read('app/social-channels/page.jsx');
const css = read('app/styles/39-social-channels-v143-42.css');
const imports = [...globals.matchAll(/^@import\s+"\.\/styles\/([^"]+)";/gm)].map((m) => m[1]);

check('v143.42 social layer is the final CSS layer', imports.at(-1) === '39-social-channels-v143-42.css');
check('social page exposes platform hooks for polished channel accents', page.includes('data-platform={platform.key}'));
check('hero text has a dedicated responsive hook', page.includes('social-v14342-hero-text'));
check('desktop hero asset is wired', css.includes("spreelo-social-hero-desktop-v143-42.png"));
check('tablet hero asset is wired', css.includes("spreelo-social-hero-tablet-v143-42.png"));
check('mobile hero asset is wired', css.includes("spreelo-social-hero-mobile-v143-42.png"));
check('mobile keeps readable action labels', css.includes('font-size: 11px !important') && !css.includes('font-size: 0 !important'));
check('mobile descriptions are no longer ellipsized', css.includes('white-space: normal !important') && css.includes('text-overflow: clip !important'));
check('tablet uses one readable channel row flow', css.includes('grid-column: 1 / -1 !important'));
check('desktop channel rows stay in one unified shell', css.includes("grid-template-columns: minmax(255px,.95fr) minmax(250px,1.1fr) minmax(315px,.95fr)"));
check('social page gets real mobile gutters', css.includes('padding: 8px 12px 34px !important'));
check('social workspace matches premium cool-light app background', css.includes('linear-gradient(180deg, #f9fbff 0%, #f7f9fd 44%, #f8fafc 100%)'));

for (const file of [
  'public/backgrounds/spreelo-social-hero-desktop-v143-42.png',
  'public/backgrounds/spreelo-social-hero-tablet-v143-42.png',
  'public/backgrounds/spreelo-social-hero-mobile-v143-42.png',
]) check(`asset exists: ${file}`, exists(file));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} v143.42 checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.42 checks passed.`);
