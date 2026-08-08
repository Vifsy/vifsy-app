import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const pinterest = read('lib/pinterestOAuth.js');
const callback = read('app/api/auth/pinterest/callback/route.js');
const social = read('app/social-channels/page.jsx');
const sv = read('lib/i18n/builtInLocaleLabels.js');
const css = read('app/styles/39-social-channels-v143-42.css');

check('OAuth requests user_accounts:read for /v5/user_account', pinterest.includes('"user_accounts:read"'));
check('OAuth still requests board + pin scopes', ['boards:read','boards:write','pins:read','pins:write'].every((scope) => pinterest.includes(scope)));
check('Callback loads Pinterest account after token exchange', callback.indexOf('exchangePinterestCode') < callback.indexOf('fetchPinterestUserAccount'));
check('Callback exposes safe account-stage diagnostic', callback.includes('pinterest_account_failed'));
check('Callback exposes safe token-stage diagnostic', callback.includes('pinterest_token_failed'));
check('Callback exposes safe save-stage diagnostic', callback.includes('pinterest_save_failed'));
check('Social page maps account-stage diagnostic', social.includes('pinterest_account_failed: "social.errorPinterestAccount"'));
check('Swedish Pinterest title has built-in fallback', sv.includes('"social.pinterestTitle": "Pinterest-anslagstavla"'));
check('Swedish Pinterest connect button has built-in fallback', sv.includes('"social.connectPinterest": "Anslut Pinterest"'));
check('Swedish picker copy has built-in fallback', sv.includes('"social.pinterestPickerTitle": "Välj Pinterest-anslagstavla"'));
check('Desktop social actions use equal fixed width', css.includes('width: 178px !important;') && css.includes('min-width: 178px !important;'));
check('Tablet social actions use equal fixed width', css.includes('width: 164px !important;') && css.includes('min-width: 164px !important;'));
check('Mobile still expands actions full width', css.includes('width: 100% !important;') && css.includes('min-width: 0 !important;'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} v143.44 Pinterest regression checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.44 Pinterest regression checks passed.`);
