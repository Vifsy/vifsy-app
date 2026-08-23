import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');

assert.match(
  route,
  /select\("id, automation_rule_id, run_log_id, started_at, updated_at"\)[\s\S]*?\.eq\("status", "running"\)[\s\S]*?\.lt\("updated_at", staleBefore\)/,
  'stale running occurrences must be judged by fresh activity (updated_at), not the original started_at'
);
assert.doesNotMatch(
  route,
  /\.eq\("status", "running"\)\s*\n\s*\.lt\("started_at", staleBefore\)/,
  'a resumed occurrence must not be killed just because its original started_at is old'
);

assert.match(
  route,
  /const uniqueItems = dedupeUrlItems\(items \|\| \[\]\)\.filter\(\(item\) => item\?\.url\)/,
  'locked carousel pool must preserve authoritative products that do not carry generic marketing descriptions'
);
assert.match(
  route,
  /const getIndexedFallbackItems = \(\) =>[\s\S]*?dedupeUrlItems\([\s\S]*?indexedSecurityRecoveredByUrl\.values\(\)/,
  'successful indexed repair products must be returned even when they do not carry generic marketing descriptions'
);
assert.match(
  route,
  /sharedIndexedSecurityState\.recoveredItems =[\s\S]*?dedupeUrlItems\(/,
  'shared protected-retailer recovery pool must preserve exact repaired products by URL'
);
assert.match(
  route,
  /Protected website product selected from authoritative indexed in-stock repair/,
  'protected single-product flow must consume the exact in-stock product it already recovered'
);
assert.match(
  route,
  /isIndexedSecurityFallbackLockedProduct\(item\)[\s\S]*?isProductEligibleForPromotion\(item\)[\s\S]*?!isCampaignFitRejectedForRule\(item, rule\)/,
  'protected authoritative selection must still require locked identity, current promotion eligibility and no explicit campaign rejection'
);
assert.match(
  route,
  /protectedAuthoritativePool[\s\S]*?allowReuseWhenExhausted: true/,
  'protected retailer may reuse a fresh verified product rather than fail after the rotation pool is exhausted'
);
assert.match(
  route,
  /requesting bounded retry instead of publishing an unverified product/,
  'protected retailer logging must not claim a retry was scheduled before the retry state machine accepts it'
);
assert.match(
  route,
  /PROTECTED_PRODUCT_RESEARCH_RETRY_EXHAUSTED/,
  'retry exhaustion must use an explicit terminal message instead of claiming another retry will happen'
);

console.log('v144.24 protected product delivery/state checks passed');
