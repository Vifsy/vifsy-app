import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');
const must = (needle, message) => assert(route.includes(needle), message);
const mustNot = (needle, message) => assert(!route.includes(needle), message);

// Generic protected-site classification must extend beyond one hard-coded Inet/403 case.
must('function isWebsiteAccessProtectedStatus(status)', 'Protected-site HTTP status classifier is missing.');
must('[401, 403, 406, 423, 451]', 'Protected-site status classifier must cover common access-protection statuses.');
must('cloudflare', 'Anti-bot/security protection detection must include Cloudflare-style blocks.');
must('akamai', 'Anti-bot/security protection detection must include Akamai-style blocks.');
must('imperva', 'Anti-bot/security protection detection must include Imperva-style blocks.');
must('datadome', 'Anti-bot/security protection detection must include DataDome-style blocks.');

// Public commerce feeds should be preferred where the merchant exposes them.
must('async function discoverShopifyProductsJson', 'Shopify public product-feed discovery is missing.');
must('/products.json?limit=250&page=', 'Shopify public product endpoint is missing.');
must('async function discoverWooCommerceStoreApiProducts', 'WooCommerce public Store API discovery is missing.');
must('/wp-json/wc/store/v1/products?per_page=100&page=', 'WooCommerce public Store API endpoint is missing.');
must('async function discoverPublicCommerceFeedCandidates', 'Unified public commerce feed discovery is missing.');
must('authoritative_public_commerce_feed: explicitInStock', 'Public commerce candidates must only become authoritative when explicitly in stock.');
must('isAuthoritativePublicCommerceFeedLockedProduct', 'Public-feed products need a strict locked-product guard.');

// Stock freshness must be separate from long-lived identity caching.
must('PROTECTED_PRODUCT_STOCK_FRESH_MS', 'Protected-site stock freshness TTL is missing.');
must('function isFreshProductStockVerification', 'Fresh stock-verification helper is missing.');
must('stock_verified_at:', 'Current stock verification timestamp must be persisted.');
must('stock_verification_source:', 'Current stock verification source must be persisted.');
must('authoritative_public_commerce_feed:', 'Public-feed lock state must be persisted in verification metadata.');
must('indexed_security_fallback_verified:', 'Indexed fallback lock state must be persisted in verification metadata.');
must('product_identity_locked:', 'Exact product identity lock must be persisted in verification metadata.');
must('product_image_page_bound:', 'Exact product-image binding must be persisted in verification metadata.');

// Protected domains should avoid repeatedly hammering known-blocked direct store-search paths.
must('websiteAccessProtected', 'Product preparation must load/use protected-domain state.');
must('productIntentScoped && !websiteAccessProtected', 'Known protected single-product sites must skip direct store-search attempts.');
assert(/async function buildLockedCampaignSearchPool[\s\S]{0,300}if \(websiteAccessProtected\)[\s\S]{0,300}return false;/.test(route), 'Known protected carousel sites must skip the direct locked campaign-search pool.');
must('Protected website product selected from fresh authoritative public commerce feed before indexed research', 'Fresh authoritative public-feed candidates must beat indexed research for single product posts.');

// Indexed fallback must be current-assortment first and bounded.
must('? ["stock_first", "stock_broad", "domain_site_search"]', 'Protected-site indexed research sequence is incomplete.');
must('MAX_INDEXED_SECURITY_FALLBACK_BATCHES = knownSecurityBlocked ? 3 : 1', 'Protected-site indexed repair must remain bounded to three batches.');
must('This is an AVAILABILITY-FIRST current-assortment attempt.', 'Availability-first research prompt is missing.');
must('This is the FINAL BROAD IN-STOCK DELIVERY attempt.', 'Broad in-stock rescue prompt is missing.');
must('This is a domain-restricted web search attempt.', 'Domain-index rescue attempt is missing.');

// Never loosen product correctness to avoid failures.
must('return getProductPromotionAvailability(item) === "in_stock";', 'Promotion eligibility must still require explicit in_stock.');
must('image_is_main_product_asset !== true', 'Exact product-image safety gate must remain intact.');
must('locked_product_primary_image_url: imageUrl', 'Original exact product image must remain the locked asset.');
mustNot('["in_stock", "available", "preorder", "backorder"].includes', 'Generic available/preorder/backorder must not become promotable again.');

// Temporary protected-site research failures should retry the same occurrence instead of immediate terminal failure.
must('class ProtectedProductResearchRetryError extends Error', 'Protected-site retry error is missing.');
must('PROTECTED_PRODUCT_RESEARCH_RETRY_DELAY_MS', 'Protected-site retry delay is missing.');
must('PROTECTED_PRODUCT_RESEARCH_MAX_RETRIES = 4', 'Protected-site automatic retry count must be bounded at four under the existing v144 SQL contract.');
must('protected_product_research_retry: protectedProductResearchRetry', 'Protected-site retry metadata is missing.');
must('throw new ProtectedProductResearchRetryError', 'Protected-site product preparation must defer rather than immediately terminal-fail when research is temporarily inconclusive.');
must('The exact customer-selected product is on a protected website and could not be safely re-verified in this attempt.', 'Exact customer-selected products on protected sites must retry without substituting a different product.');

console.log('v144.20 adaptive protected-commerce discovery checks passed');
