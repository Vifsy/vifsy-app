import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

assert.match(route, /product_engine_exact_page_static/, 'Product Engine must retain static exact-page image provenance.');
assert.match(route, /product_engine_exact_page_rendered/, 'Product Engine must retain rendered exact-page image provenance.');
assert.match(route, /function buildLockedProductFromVerifiedExactPageCandidate/, 'A generic verified exact-page lock bridge must exist.');
assert.match(route, /candidate\?\.product_image_page_bound !== true/, 'The bridge must require exact-page image binding.');
assert.match(route, /candidate\?\.technical_identity_same_page_verified !== true/, 'The bridge must require same-page technical identity verification.');
assert.match(route, /Verified exact-page Product Engine object reused as final product lock/, 'The final lock must be able to reuse prior strong verification.');
assert.match(route, /verifiedCandidate: item/, 'Single-product finalization must carry the verified candidate into locking.');
assert.match(route, /Math\.max\(\s*WEBSITE_TEXT_INTENT_STORE_VERIFY_LIMIT,\s*storeSearchItems\.length/s, 'All verified store-search candidates must be eligible for lock fallback.');

assert.match(route, /Web-search verified product could not be locked; trying next verified product/, 'Verified web-research candidates must fall through to the next product instead of killing the occurrence.');
assert.match(route, /Web-search verified lock pool exhausted; trying one bounded AI repair/, 'AI repair must be delayed until the verified web-research pool is exhausted.');
assert.match(route, /\{ allowAiRepair: false \}/, 'Deterministic verified candidates must be attempted before another AI repair.');
assert.doesNotMatch(route, /emmaljunga/i, 'The fix must be retailer-agnostic and contain no Emmaljunga special case.');

console.log('v144.47 generic verified-page lock bridge regression checks passed');
