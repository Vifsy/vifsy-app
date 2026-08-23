import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const cron = read('app/api/cron/run-automations/route.js');
const translations = read('app/api/ui-translations/route.js');
const uiText = read('lib/i18n/useUiText.js');
const adminApprovals = read('app/api/admin/post-approvals/route.js');

// Protected retailers may deliver the five actual carousel slides without a sixth reserve.
assert.match(cron, /const campaignRequiredVerifiedCount = websiteAccessProtected\s*\? CAROUSEL_PRODUCT_SLIDE_TARGET\s*:\s*CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED/);
assert.match(cron, /requireReserve: !websiteAccessProtected/);
assert.match(cron, /requireReserve = true/);
assert.match(cron, /requireReserve &&\s*validProducts\.length < CAMPAIGN_PRIMARY_WEB_RESEARCH_MIN_VERIFIED/);
assert.match(cron, /!requireReserve && validProducts\.length < CAROUSEL_PRODUCT_SLIDE_TARGET/);
assert.match(cron, /\(requireReserve && reserveProducts\.length < 1\)/);
assert.match(cron, /requiredReserveProductCount: websiteAccessProtected \? 0 : 1/);

// Do not weaken the exact-product/image correctness gates while fixing delivery.
assert.match(cron, /product_image_semantic_verified === true/);
assert.match(cron, /product_image_identity_unresolved !== true/);
assert.match(cron, /return getProductPromotionAvailability\(item\) === "in_stock";/);

// A durable retry must be visible in the normal admin queue, not silently hidden.
assert.match(adminApprovals, /status === "queue"[\s\S]{0,300}\.eq\("status", "retry_pending"\)/);
assert.match(adminApprovals, /\["running", "retry_pending"\]/);
assert.match(adminApprovals, /occurrence\.status === "failed_terminal" \? "failed" : "creating"/);

// UI translation requests are now small, bounded and unable to hold a Vercel request for ~60 s.
assert.match(translations, /export const maxDuration = 30/);
assert.match(translations, /MAX_NAMESPACES_PER_REQUEST = 4/);
assert.match(translations, /TRANSLATION_CHUNK_SIZE = 80/);
assert.match(translations, /TRANSLATION_CONCURRENCY = 4/);
assert.match(translations, /TRANSLATION_FETCH_TIMEOUT_MS = 6500/);
assert.match(translations, /new AbortController\(\)/);
assert.match(translations, /signal: controller\.signal/);
assert.match(translations, /UI translation chunk deferred/);
assert.match(translations, /status: translationComplete \? "ready" : "updating"/);
assert.match(translations, /mapWithConcurrency\(\s*namespaces,\s*2,/);

// Switching language no longer eagerly asks for every namespace in Spreelo.
assert.match(uiText, /const PRELOAD_UI_NAMESPACES = \["common", "layout"\]/);
assert.doesNotMatch(uiText, /namespaces:\s*ALL_UI_NAMESPACES/);
assert.match(uiText, /const TRANSLATION_CACHE_VERSION = "v20"/);
assert.match(uiText, /const translationsComplete = hasAllRequiredLabels/);
assert.match(uiText, /setLoading\(!translationsComplete\)/);
assert.match(uiText, /setTranslationRetry\(\(current\) => current \+ 1\)/);

console.log('v144.22 carousel delivery/translation/admin resilience checks passed');
