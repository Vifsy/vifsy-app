import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

assert.match(route, /function getWebsiteLocalePathScope\(value\)/, 'locale path scope helper missing');
assert.match(route, /\^\(\[a-z\]\{2,3\}\)-\(\[a-z\]\{2\}\)\$/, 'compound language-market path support missing');
assert.match(route, /function matchesConfiguredWebsiteMarket\(candidateUrl, websiteUrl, targetMarketCode = ""\)/, 'market matcher must accept an explicit product-market code');
assert.ok(route.includes('candidateMarket !== targetMarket'), 'explicit conflicting product market must be rejected');
assert.ok(route.includes('Product market and content language are intentionally independent.'), 'market/language separation contract missing');
assert.ok(!route.includes('candidate?.language && candidate.language !== preferredLanguage'), 'content language must not reject a valid product market');
assert.match(route, /return localizedBase \? \[localizedBase\] : \[origin\]/, 'localized sites must not also probe bare-origin search endpoints');
assert.match(route, /Store Map cross-market nodes excluded/, 'Store Map cached cross-market filtering missing');
assert.match(route, /crawlStartUrl = hasExplicitLocaleScope && seedUrl \? seedUrl : originUrl/, 'Store Map must start at the saved locale when one exists');
assert.match(route, /getProductMarketCodeForRule\(rule, websiteUrl\)/, 'brand market must drive runtime product filtering');

// Regression scenario: /sv-se and /en-se are the same market and may both be
// used for a Swedish assortment, while /da-dk is a different market.
const compoundLocaleRegex = /^([a-z]{2,3})-([a-z]{2})$/;
assert.deepEqual('sv-se'.match(compoundLocaleRegex)?.slice(1), ['sv', 'se']);
assert.deepEqual('en-se'.match(compoundLocaleRegex)?.slice(1), ['en', 'se']);
assert.deepEqual('da-dk'.match(compoundLocaleRegex)?.slice(1), ['da', 'dk']);
assert.equal('sv-se'.match(compoundLocaleRegex)?.[2], 'en-se'.match(compoundLocaleRegex)?.[2]);
assert.notEqual('sv-se'.match(compoundLocaleRegex)?.[2], 'da-dk'.match(compoundLocaleRegex)?.[2]);

console.log('v144.43 market/locale product lock checks passed');
