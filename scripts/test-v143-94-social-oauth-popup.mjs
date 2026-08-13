import fs from 'node:fs';

const files = {
  social: fs.readFileSync('app/social-channels/page.jsx', 'utf8'),
  bridge: fs.readFileSync('app/social-channels/oauth-complete/page.jsx', 'utf8'),
  helper: fs.readFileSync('lib/socialOAuthResult.js', 'utf8'),
  instagram: fs.readFileSync('app/api/auth/instagram/callback/route.js', 'utf8'),
  threads: fs.readFileSync('app/api/auth/threads/callback/route.js', 'utf8'),
  pinterest: fs.readFileSync('app/api/auth/pinterest/callback/route.js', 'utf8'),
  facebook: fs.readFileSync('app/api/meta/callback/route.js', 'utf8'),
  facebookSelect: fs.readFileSync('app/social-channels/facebook/select/page.jsx', 'utf8'),
  pinterestSelect: fs.readFileSync('app/social-channels/pinterest/select/page.jsx', 'utf8'),
  defaults: fs.readFileSync('lib/i18n/defaultLabels.js', 'utf8'),
  sv: fs.readFileSync('lib/i18n/builtInLocaleLabels.js', 'utf8'),
  css: fs.readFileSync('app/styles/38-current-experience-v143.css', 'utf8'),
};

const failures = [];
function check(name, condition) {
  if (!condition) failures.push(name);
  console.log(`${condition ? '✓' : '✗'} ${name}`);
}

check('Social connections open a separate popup before async OAuth start', files.social.includes('window.open("about:blank"') && files.social.includes('spreelo_oauth_${platform.key}'));
check('Popup can be reused after first Instagram sign-in', files.social.includes('reusePopup = false') && files.social.includes('continueOAuthFlow'));
check('Parent listens for same-origin OAuth completion message', files.social.includes('event.origin !== window.location.origin') && files.social.includes('spreelo-social-oauth-result'));
check('Closed popup leaves a clear resume state', files.social.includes('popupClosed: true') && files.social.includes('social.oauthPopupClosedText'));
check('Instagram first-login recovery guidance exists', files.social.includes('social.oauthInstagramFirstLoginText'));
check('OAuth bridge posts result to opener and closes itself', files.bridge.includes('window.opener.postMessage') && files.bridge.includes('window.close()'));
check('OAuth bridge has full-tab fallback', files.bridge.includes('window.location.replace(fallback.toString())'));
check('Server helper targets popup completion bridge', files.helper.includes('/social-channels/oauth-complete'));
check('Instagram callback uses bridge for success', files.instagram.includes('buildSocialOAuthResultUrl') && files.instagram.includes('connected: "instagram"'));
check('Threads callback uses bridge for success', files.threads.includes('buildSocialOAuthResultUrl') && files.threads.includes('connected: "threads"'));
check('Pinterest OAuth errors use bridge', files.pinterest.includes('buildSocialOAuthResultUrl'));
check('Facebook OAuth errors use bridge', files.facebook.includes('buildSocialOAuthResultUrl'));
check('Facebook page selection completes through bridge', files.facebookSelect.includes('/social-channels/oauth-complete?connected=facebook'));
check('Pinterest board selection completes through bridge', files.pinterestSelect.includes('/social-channels/oauth-complete?connected=pinterest'));
check('English popup UX labels exist', files.defaults.includes('social.oauthPopupTitle') && files.defaults.includes('Continue connection'));
check('Swedish popup UX labels exist', files.sv.includes('social.oauthPopupTitle') && files.sv.includes('Fortsätt anslutningen'));
check('Popup helper has responsive styling', files.css.includes('.social-oauth-helper-backdrop') && files.css.includes('@media (max-width: 640px)'));

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll v143.94 social OAuth popup checks passed.');
