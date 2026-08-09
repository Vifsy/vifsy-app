import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('Single-product Pinterest Pins still prefer the exact post website URL',
  worker.includes("return { url: postWebsiteUrl, source: 'post_website_url' }"));
check('Carousel Pinterest Pins still prefer campaign/category outro destination',
  worker.includes("source: 'carousel_outro'") && worker.includes("role.includes('outro')"));
check('Pinterest top-level Pin keeps title', worker.includes('title: copy.title'));
check('Pinterest top-level Pin keeps description', worker.includes('description: copy.description'));
check('Pinterest top-level destination link is written', worker.includes('body.link = copy.link'));
check('Multi-image Pinterest items carry a title',
  worker.includes('items: uniqueImageUrls.map((url) => {') && worker.includes('title: copy.title'));
check('Multi-image Pinterest items carry a description',
  worker.includes('items: uniqueImageUrls.map((url) => {') && worker.includes('description: copy.description'));
check('Multi-image Pinterest items carry the click-through destination',
  worker.includes('if (copy.link) item.link = copy.link'));
check('Pinterest carousel continues to exclude AI outro media',
  worker.includes('outroIncluded: false') && worker.includes('.slice(0, 5)'));
check('Pinterest publish logs how many per-image destinations were sent',
  worker.includes('Pinterest Pin payload accepted') && worker.includes('perImageDestinations:'));
check('Carousel product name uses stronger bold weight', /font-weight=\"9(?:00|50)\"/.test(worker));
check('Carousel product name uses a dedicated text area below the divider',
  worker.includes('const textAreaTop = eyebrow ? labelBox.y + 68 : labelBox.y + 16;'));
check('Carousel product text block is vertically centred in the available glass-card area',
  worker.includes('(textAreaHeight - renderedTextHeight) / 2'));
check('v143.54 test is registered',
  pkg.scripts?.['test:v143.54'] === 'node scripts/test-v143-54-pinterest-clickthrough-product-label.mjs');

console.log(`v143.54 checks passed: ${checks.length}/${checks.length}`);
