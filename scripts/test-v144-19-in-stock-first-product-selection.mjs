import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

const must = (needle, message) => assert(route.includes(needle), message);
const mustNot = (needle, message) => assert(!route.includes(needle), message);

must('CAMPAIGN_PRIMARY_ASSET_REPAIR_TIMEOUT_MS || 90_000', 'Exact repair default timeout must be 90s.');
must('return getProductPromotionAvailability(item) === "in_stock";', 'Promotion eligibility must require explicit in_stock.');
must('purchase buttons alone are not stock proof', 'Add-to-cart-only stock proof must be disabled.');
must('? ["stock_first", "stock_broad", "domain_site_search"]', 'Known protected domains must use stock-first, broad-stock and domain-index research.');
must('This is an AVAILABILITY-FIRST current-assortment attempt.', 'Stock-first web research prompt is missing.');
must('This is the FINAL BROAD IN-STOCK DELIVERY attempt.', 'Broad in-stock delivery fallback is missing.');
must('only in_stock is eligible for promotion', 'Authoritative repair must require in-stock products.');
must('beställningsvara/order item', 'Order-only products must be explicitly rejected by the repair policy.');
must('selectedCandidateAvailabilityStatus !== "in_stock"', '403 repair must be allowed to replace stale/unknown/non-stock candidates.');
must('availabilityStatus === "in_stock"', 'Replacement must itself be in stock.');
assert(/MAX_INDEXED_SECURITY_FALLBACK_BATCHES = knownSecurityBlocked \? (?:2|3) : 1/.test(route), 'Protected-site fallback must remain bounded while permitting multiple current-assortment research/repair passes.');
must('trying another bounded current-assortment research pass', '403 fallback must continue instead of terminally returning after the first empty batch.');
must('Product researcher rejected product without explicit current in-stock proof', 'Direct product verification must reject unknown/order-only stock states.');

mustNot('["in_stock", "available", "preorder", "backorder"].includes', 'Preorder/backorder/generic available must not count as in-stock.');

console.log('v144.19 in-stock-first product selection checks passed');
