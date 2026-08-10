import fs from 'node:fs';

const css = fs.readFileSync(new URL('../app/styles/38-current-experience-v143.css', import.meta.url), 'utf8');
const deploy = fs.readFileSync(new URL('../DEPLOY_V143_72.md', import.meta.url), 'utf8');
function expect(condition, message) { if (!condition) throw new Error(message); }

expect(css.includes('v143.72 — softer Spreelo actions and legible compact typography'), 'v143.72 CSS section missing');
expect(css.includes('.spreelo-action-v14371.compact {\n  min-height:36px;'), 'Compact Spreelo actions must be taller and easier to read.');
expect(css.includes('font-size:11.5px;'), 'Readable compact action/body size must exist.');
expect(css.includes('background:linear-gradient(135deg,#ef6846'), 'Primary actions must use Spreelo coral gradient rather than black.');
expect(css.includes('.home-v14369-section-heading span {\n  color:#6f7a8b;\n  font-size:11.5px;'), 'Home descriptive copy must be readable.');
expect(css.includes('.admin-v14370-review-open {\n  min-height:34px;'), 'Admin review action must use the polished compact sizing.');
expect(deploy.includes('No SQL migration is required'), 'Deploy note must state SQL requirement.');
console.log('v143.72 Spreelo button + legibility regression checks passed');
