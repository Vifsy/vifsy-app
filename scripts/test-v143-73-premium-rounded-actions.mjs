import fs from 'node:fs';
const css = fs.readFileSync(new URL('../app/styles/38-current-experience-v143.css', import.meta.url), 'utf8');
const deploy = fs.readFileSync(new URL('../DEPLOY_V143_73.md', import.meta.url), 'utf8');
function expect(condition, message) { if (!condition) throw new Error(message); }
expect(css.includes('v143.73 — premium rounded Spreelo action system'), 'v143.73 CSS section missing');
expect(css.includes('border-radius:14px !important;'), 'New Home/Review actions must use a visibly rounded 14px radius.');
expect(css.includes('background:linear-gradient(135deg,#1d2940 0%,#121d30 58%,#18243a 100%)'), 'Primary actions must use the restrained navy treatment.');
expect(css.includes('.spreelo-action-v14371.primary svg {\n  color:#f09a80;'), 'Coral should be limited to the primary action icon/accent.');
expect(css.includes('.home-v14370-review-actions a:not(.history)'), 'Home review CTA must use the premium primary treatment.');
expect(css.includes('.home-v14370-review-actions a.history,'), 'History action must retain a separate secondary treatment.');
expect(deploy.includes('No SQL migration is required'), 'Deploy note must state SQL requirement.');
console.log('v143.73 premium rounded action regression checks passed');
