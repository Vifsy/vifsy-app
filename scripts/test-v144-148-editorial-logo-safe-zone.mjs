import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

assert.match(source, /BOTTOM SAFE ZONE — ALWAYS REQUIRED/);
assert.match(source, /lowest 9–10% of the image as calm visual breathing room/);
assert.match(source, /bottom-right of this safe zone/);
assert.match(source, /refreshEditorialBrandLogoConfig/);
assert.match(source, /\.from\("brand-assets"\)\s*\.download\(storagePath\)/s);
assert.match(source, /Editorial product post logo settings resolved/);
assert.match(source, /applyEditorialProductLogoOverlayRequired/);
assert.match(source, /brand_profile: editorialBrandProfile/);
assert.match(source, /Create one original product-specific headline/);

console.log('v144.148 editorial logo source checks passed with current footer-safe-zone contract');
