import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

const must = (text, message) => assert(route.includes(text), message);
const mustNot = (text, message) => assert(!route.includes(text), message);

must('function normalizeProductAvailabilityStatus(value)', 'Availability normalization helper is missing.');
must('function isProductConfirmedPurchasable(item)', 'Confirmed-purchasable helper is missing.');
must('availability_status:', 'Exact repair must return availability_status.');
must('availability_evidence:', 'Exact repair must return availability_evidence.');
must('locked_product_availability: availabilityStatus', 'Locked exact products must persist availability.');
must('!isProductKnownUnavailableForPromotion(item)', 'Known unavailable products must be filtered from valid product pools.');
must('Indexed security fallback rejected product that is not currently purchasable', '403 fallback must reject unavailable products.');
must('MAX_INDEXED_SECURITY_FALLBACK_BATCHES = 1', '403 exact-product recovery must remain limited to one paid batch.');
must('allowPurchasableReplacements: true', 'The one paid 403 batch must be allowed to replace an explicitly unavailable indexed candidate.');
must('replacement_for_unavailable', 'Exact repair schema must carry explicit unavailable-product replacement state.');
must('selected_candidate_availability_status', 'Replacement safety must prove the originally selected candidate was unavailable.');
must('gpt55_purchasable_replacement', 'Purchasable replacements must be explicitly marked in the locked product object.');
must('Never return a product that the official page marks as discontinued', 'Web researcher must be instructed to avoid unavailable products.');

mustNot('TEXT BETA:', 'Kling text beta must be removed.');
mustNot('OVERLAY TEXT BETA:', 'Kling overlay-text beta prompt must be removed.');
mustNot('sanitizeKlingOverlayPhrase', 'Kling overlay generation helper must be removed.');
must('Do not generate any new readable overlay text, captions, slogans, prices, labels or typography', 'Kling must explicitly forbid new readable text.');

// v144.16 delivery-first protections must remain: do not reintroduce the hard
// whole-product gallery gate that caused no_suitable_product terminal failures.
mustNot('Generative product candidate skipped because it is clearly unavailable', 'v144.15 generative availability hard gate must stay removed.');
mustNot('prepareGenerativeProductReferenceCandidates', 'v144.15 generative whole-product hard gate must stay removed.');

console.log('v144.17 purchasable-product and no-Kling-text checks passed');
