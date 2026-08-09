import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('Semantic image identity gate exists', route.includes('async function reviewResolvedProductImageIdentity'));
check('Semantic gate explicitly rejects cross-category and cross-brand mismatches', route.includes('sneakers vs a clothing set') && route.includes('conflicting visible brand/model'));
check('Semantic gate fails closed when unavailable', route.includes('semantic_verifier_failed_closed') && route.includes('failClosed: true'));
check('Primary resolved product images pass through semantic identity review', /technicallyResolvedItems[\s\S]{0,500}reviewResolvedProductImageIdentity/.test(route));
check('Reserve carousel images also pass through semantic identity review', /resolvedReserveItems[\s\S]{0,600}reviewResolvedProductImageIdentity/.test(route));
check('Single product selection requires semantic identity verification', route.includes('No exact product-image identity could be verified') && route.includes('product_image_semantic_verified === true'));
check('Carousel refuses unverified product images', route.includes('Carousel product identity safety gate blocked') && route.includes('semanticallyUnverifiedProducts'));
check('Product slide source image is bound to selected product object', route.includes('Never trust generated slide order for the source product image') && route.includes('slideProduct?.image_url'));
check('Product slides carry stable identity keys', route.includes('product_identity_key: createItemKey(product)') && route.includes('product_identity_url'));
check('Carousel slide URL/title identity mismatch is fatal', route.includes('Carousel slide ${index + 1} product identity mismatch'));
check('AI cannot rename concrete product slide headline', route.includes('AI may not rename or reorder the') && route.includes('sanitizeProductTitleForCard(product.title)'));
check('Post copy has a model-backed exact product identity validator', route.includes('async function validateProductCopyIdentityWithModel') && route.includes('product_copy_identity_validation'));
check('Wrong concrete product mentions trigger a strict rewrite', route.includes('async function rewriteProductCopyToExactContract') && route.includes('Product copy rejected by identity gate'));
check('Copy fails closed if the rewrite still mentions wrong products', route.includes('Product copy identity gate failed closed after rewrite') && route.includes('Product copy could not be made identity-safe'));
check('Carousel copy is no longer exempt from identity validation', !/PRODUCT_ENGINE_V2_ENABLED \|\| isCarouselRule\(rule\)/.test(route));

console.log(`v143.57 product identity integrity checks passed (${checks.length}/${checks.length}).`);
