import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');

assert.match(source, /BOTTOM SAFE ZONE — ALWAYS REQUIRED/);
assert.match(source, /lowest 9–10% of the image as calm visual breathing room/);
assert.match(source, /This safe zone is required whether or not a brand logo is enabled/);
assert.match(source, /No logo is enabled, but preserve the same 9–10% breathing room/);
assert.match(source, /A small brand logo will be overlaid later in the bottom-right of this safe zone/);
assert.doesNotMatch(source, /lowest 18% of the image/);
assert.match(source, /refreshEditorialBrandLogoConfig/);
assert.match(source, /applyEditorialProductLogoOverlayRequired/);
assert.match(source, /Create one original product-specific headline/);

console.log('v144.149 fixed editorial bottom safe-zone source checks passed');
