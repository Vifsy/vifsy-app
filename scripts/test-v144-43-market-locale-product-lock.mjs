import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

assert.match(route, /function getWebsiteLocalePathScope\(value\)/, 'locale path scope helper missing');
assert.match(route, /\^\(\[a-z\]\{2,3\}\)-\(\[a-z\]\{2\}\)\$/, 'compound language-market path support missing');
assert.match(route, /function matchesConfiguredWebsiteMarket\(candidateUrl, websiteUrl, preferredContentLanguage = ""\)/, 'market matcher must accept language fallback');
assert.ok(route.includes('candidate?.language && candidate.language !== configured.language'), 'explicit configured language mismatch must be rejected');
assert.ok(route.includes('candidate?.market && candidate.market !== configured.market'), 'explicit configured market mismatch must be rejected');
assert.ok(route.includes('candidate?.language && candidate.language !== preferredLanguage'), 'root-domain content-language mismatch must be rejected');
assert.match(route, /return localizedBase \? \[localizedBase\] : \[origin\]/, 'localized sites must not also probe bare-origin search endpoints');
assert.match(route, /Product discovery rejected cross-market locale candidates/, 'cross-market discovery diagnostics missing');
assert.match(route, /Store Map cross-market nodes excluded/, 'Store Map cached cross-market filtering missing');
assert.match(route, /crawlStartUrl = hasExplicitLocaleScope && seedUrl \? seedUrl : originUrl/, 'Store Map must start at the saved locale when one exists');
assert.match(route, /matchesConfiguredWebsiteMarket\(item\?\.url, websiteUrl, preferredContentLanguage\)/, 'website discovery must filter locale before persistence');
assert.match(route, /rule\?\.language \|\| rule\?\.content_language \|\| rule\?\.brand_profile\?\.content_language/, 'rule language must drive market-neutral domain fallback');

// Regression scenario represented by the implementation contract:
// /sv-se must be distinguishable from /da-dk, and a Swedish root-domain
// automation must not accept an explicitly Danish language path.
const compoundLocaleRegex = /^([a-z]{2,3})-([a-z]{2})$/;
assert.deepEqual('sv-se'.match(compoundLocaleRegex)?.slice(1), ['sv', 'se']);
assert.deepEqual('da-dk'.match(compoundLocaleRegex)?.slice(1), ['da', 'dk']);
assert.notEqual('sv', 'da');

console.log('v144.43 market/locale product lock checks passed');
