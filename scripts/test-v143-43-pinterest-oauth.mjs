import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });

const social = read('app/social-channels/page.jsx');
const pinterest = read('lib/pinterestOAuth.js');
const start = read('app/api/auth/pinterest/start/route.js');
const callback = read('app/api/auth/pinterest/callback/route.js');
const boards = read('app/api/pinterest/boards/route.js');
const picker = read('app/social-channels/pinterest/select/page.jsx');
const labels = read('lib/i18n/defaultLabels.js');

check('Pinterest platform is visible in Social channels', social.includes('key: "pinterest"'));
check('Pinterest uses official icon asset', social.includes('/social-icons/pinterest.png'));
check('Pinterest connect endpoint is wired', social.includes('/api/auth/pinterest/start'));
check('OAuth uses Pinterest authorization endpoint', pinterest.includes('https://www.pinterest.com/oauth/'));
check('OAuth requests board + pin scopes', ['boards:read','boards:write','pins:read','pins:write'].every((scope) => pinterest.includes(scope)));
check('OAuth state is signed and time limited', pinterest.includes('createHmac') && pinterest.includes('10 * 60 * 1000'));
check('OAuth callback route exists', exists('app/api/auth/pinterest/callback/route.js'));
check('Code exchange uses Basic client authentication', pinterest.includes('Authorization: `Basic ${basic}`'));
check('Code exchange uses Pinterest v5 token endpoint', pinterest.includes('https://api.pinterest.com/v5/oauth/token'));
check('Pinterest profile is loaded after OAuth', callback.includes('fetchPinterestUserAccount'));
check('Pinterest token stays server-side in social_connections', pinterest.includes('page_access_token: accessToken'));
check('Pending connection requires board choice before connected status', pinterest.includes('status: "disconnected"'));
check('Board list endpoint uses Pinterest v5 boards', pinterest.includes('https://api.pinterest.com/v5/boards'));
check('Board selection validates board against Pinterest response', boards.includes('boards.find((board) => String(board.id) === boardId)'));
check('Board selection activates connection', boards.includes('status: "connected"'));
check('Pinterest board picker exists', exists('app/social-channels/pinterest/select/page.jsx'));
check('Picker handles empty fresh Pinterest accounts', picker.includes('pinterestNoBoardsTitle') && picker.includes('https://www.pinterest.com/'));
check('Pinterest success message is handled', social.includes('connected === "pinterest"'));
check('Pinterest OAuth error states are user-facing', social.includes('pinterest_callback_failed') && labels.includes('social.errorPinterestCallback'));
check('Pinterest expiry copy does not falsely promise refresh', labels.includes('Pinterest access is valid until {date}.'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? '✓' : '✗'} ${item.name}`);
if (failed.length) {
  console.error(`\n${failed.length} v143.43 Pinterest checks failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} v143.43 Pinterest checks passed.`);
