import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

// Market and customer-facing text language are independent authorities.
assert.match(route, /function getProductMarketCodeForRule\(rule, websiteUrl = "", brandProfile = null\)/, 'product market resolver missing');
assert.match(route, /brandProfile\?\.country_code \|\| rule\?\.country_code/, 'country code must be the first product-market signal');
assert.match(route, /brandProfile\?\.content_market \|\| rule\?\.content_market/, 'analyzed content market fallback missing');
assert.match(route, /rule\.language = resolvedPostLanguage\.language/, 'resolved content language must still control generated copy');
assert.match(route, /rule\.content_language = resolvedPostLanguage\.language/, 'resolved content language must still control overlays/copy');
assert.match(route, /rule\.content_market =\s*automationBrandProfile\?\.content_market/, 'brand market must be attached to runtime rule');
assert.match(route, /rule\.country_code =\s*automationBrandProfile\?\.country_code/, 'brand country code must be attached to runtime rule');
assert.ok(!route.includes('preferredContentLanguage'), 'content language must not be reused as a product-market filter');

// Whole-website product discovery resolves the actual storefront for the target market.
assert.match(route, /async function resolveMarketAwareProductSourceUrl\(/, 'market-aware storefront resolver missing');
assert.match(route, /Market-specific product storefront resolved/, 'market storefront diagnostics missing');
assert.match(route, /contentSourceScope === "whole_website"\s*\? await resolveMarketAwareProductSourceUrl/, 'whole-website product discovery must resolve market storefront first');
assert.match(route, /areLikelySameBrandWebsiteUrls/, 'official same-brand host migration support missing');
assert.match(route, /derived_market_locale/, 'derived language-market storefront probing missing');
assert.match(route, /cn: \["zh", "en"\]/, 'Chinese market language path support missing');
assert.match(route, /uz: \["uz", "ru", "en"\]/, 'non-Western market path support missing');

// Shopify public feeds must stay inside the market-specific base rather than falling back to bare origin.
assert.match(route, /const storefrontBase = getWebsiteSearchBaseUrls\(websiteUrl\)\[0\] \|\| origin;/, 'Shopify localized storefront base missing');
assert.match(route, /`\$\{storefrontBase\}\/products\.json\?limit=250&page=\$\{page\}`/, 'Shopify products feed must use localized storefront base');
assert.match(route, /`\$\{storefrontBase\}\/products\/\$\{handle\}`/, 'Shopify product URLs must retain localized storefront base');

// Single-product discovery must reserve time for actual product verification instead of exhausting the budget on navigation.
assert.match(route, /agentDeadline - 70_000/, 'single-product Store Map must reserve verification budget');
assert.match(route, /productVerificationReserveMs = singleProductFocusedDiscovery \? 42_000 : 35_000/, 'focused single-product discovery verification reserve missing');
assert.match(route, /const focusedCandidateTarget = Math\.max\(/, 'bounded focused candidate target missing');
assert.match(route, /const requestedVerifiedCount = singleProductFocusedDiscovery/, 'single-product bounded verification target missing');
assert.match(route, /deeplyVerified\.length >= minimumDeepVerifiedProducts/, 'category-card fallbacks must not satisfy the deep-verification stop condition');

// Cached Store Maps from a global/other locale must be refreshed when a market-specific storefront is resolved.
assert.match(route, /Store Map refresh forced for market-specific storefront/, 'market-specific Store Map refresh missing');
assert.match(route, /explicitlyMarketScopedCachedNodeCount < 3/, 'localized Store Map cache quality check missing');

// This is intentionally generic, not a retailer-specific patch.
assert.equal(route.toLowerCase().includes('emmaljunga'), false, 'market fix must not hardcode a retailer');

console.log('v144.52 market assortment + content-language separation checks passed');
