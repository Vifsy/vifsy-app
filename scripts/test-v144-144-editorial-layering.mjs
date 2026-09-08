import fs from 'node:fs';
import assert from 'node:assert/strict';

const route = fs.readFileSync('app/api/cron/run-automations/route.js','utf8');
const regen = fs.readFileSync('app/api/admin/post-approvals/regenerate-product/route.js','utf8');

assert.match(route, /Create ONLY the finished BACKGROUND LAYER/);
assert.match(route, /Do NOT draw any headline, product name, caption, label, CTA, logo, URL or other readable text/);
assert.match(route, /createWebsiteItemEditorialTypographyOverlay/);
assert.match(route, /native_transparent_product_then_typography/);
assert.match(route, /exactly TWO text roles: headline \+ product\/model name/i);
assert.match(route, /Do NOT add a supporting sentence/);
assert.match(route, /safeZoneTop/);
assert.match(route, /zoneBottom = 1120/);
assert.doesNotMatch(route, /Locked product placement in the final 1024×1280 canvas/);
assert.doesNotMatch(route, /Treat that placed product box as reserved/);
assert.doesNotMatch(route, /hard no-text zone/);
assert.match(route, /shouldUseLogoForEditorialProductPost/);
assert.match(route, /stale snapshot must not/);
assert.match(route, /editorialIncludeLogo/);
assert.match(regen, /shouldUseLogoForEditorialProductPost/);

console.log('v144.144 editorial layering checks passed');
