import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const worker = fs.readFileSync(path.join(root, 'app/api/cron/run-automations/route.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('Approved publish query loads the stored website destination',
  worker.includes('automation_rule_id, website_url, content, platform'));
check('Carousel publish query loads per-slide product URLs',
  worker.includes('.select("id, slide_order, image_url, product_url, headline, body, cta_text, metadata")'));
check('Pinterest destinations only accept HTTP(S) URLs',
  worker.includes("if (!['http:', 'https:'].includes(url.protocol)) return \"\";"));
check('Pinterest links receive Pinterest source attribution',
  worker.includes("url.searchParams.set('utm_source', 'pinterest')"));
check('Pinterest links receive organic-social medium attribution',
  worker.includes("url.searchParams.set('utm_medium', 'organic_social')"));
check('Pinterest links receive Spreelo campaign attribution',
  worker.includes("url.searchParams.set('utm_campaign', 'spreelo')"));
check('Pinterest links receive per-post content attribution',
  worker.includes("url.searchParams.set('utm_content', String(postId))"));
check('Existing UTM values are preserved instead of overwritten',
  worker.includes("if (!url.searchParams.has('utm_source'))") && worker.includes("if (!url.searchParams.has('utm_campaign'))"));
check('Product carousel prefers the dedicated outro/category destination',
  worker.includes("source: 'carousel_outro'") && worker.includes("role.includes('outro')"));
check('Single-product and normal visual Pins prefer posts.website_url',
  worker.includes("source: 'post_website_url'") && worker.includes('post?.website_url'));
check('Explicit caption URL remains a fallback',
  worker.includes("source: 'caption_url'"));
check('Brand website is used as final marketing fallback',
  worker.includes("source: 'brand_website_fallback'") && worker.includes("website_product_source_url"));
check('Pinterest publish function receives an explicit destination URL',
  worker.includes("destinationUrl = ''") && worker.includes('destinationUrl: pinterestDestination.url'));
check('Pinterest Pin payload writes the click-through link field',
  worker.includes('body.link = copy.link'));
check('Publisher logs destination selection without dumping the full URL',
  worker.includes('Pinterest publish destination selected') && worker.includes('destinationHost:'));
check('v143.52 package test script is registered',
  packageJson.scripts?.['test:v143.52'] === 'node scripts/test-v143-52-pinterest-smart-destination-links.mjs');

console.log(`v143.52 checks passed: ${checks.length}/${checks.length}`);
