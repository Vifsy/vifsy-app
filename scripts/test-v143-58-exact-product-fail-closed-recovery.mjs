import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check(
  'Exact product asset repair always uses retailer-domain web search',
  /async function repairAuthoritativeWebAgentProductAssets[\s\S]{0,8000}tools:\s*\[[\s\S]{0,800}type:\s*"web_search"[\s\S]{0,800}tool_choice:\s*"required"/.test(route)
);
check(
  'Exact asset repair no longer references out-of-scope editorial-pool flag',
  !/async function repairAuthoritativeWebAgentProductAssets[\s\S]{0,8000}useVerifiedEditorialPool/.test(route)
);
check(
  'Carousel minimum verified product count is the full five-product target',
  route.includes('const CAROUSEL_PLATFORM_MIN_PRODUCT_SLIDES = CAROUSEL_PRODUCT_SLIDE_TARGET;')
);
check(
  'Carousel verification cannot be bypassed when first product has no image',
  route.includes('A missing image on the first selected product must never') &&
    /websiteItem \|\|[\s\S]{0,250}Array\.isArray\(websiteItems\)/.test(route)
);
check(
  'Incomplete exact product pool fails closed instead of warning and continuing',
  route.includes('CAROUSEL_EXACT_PRODUCT_POOL_INCOMPLETE') &&
    route.includes('The post was blocked instead of creating an incomplete carousel or risking a wrong product.')
);
check(
  'Old incomplete-carousel warning-only path is gone',
  !route.includes('Carousel image verification could not fill every product slot')
);
check(
  'Final slide saver still blocks semantically unverified images',
  route.includes('Carousel product identity safety gate blocked') &&
    route.includes('product?.product_image_semantic_verified !== true')
);
check(
  'Final slide saver blocks fewer than five verified products',
  /productCount < CAROUSEL_PLATFORM_MIN_PRODUCT_SLIDES/.test(route) &&
    route.includes('verified products with images')
);
check(
  'Product copy identity gate remains active',
  route.includes('Product copy passed identity gate') &&
    route.includes('Product copy identity gate failed closed after rewrite')
);

console.log(`v143.58 exact product recovery/fail-closed checks passed (${checks.length}/${checks.length}).`);
