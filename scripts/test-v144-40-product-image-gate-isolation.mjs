import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'app/api/cron/run-automations/route.js'), 'utf8');

assert.match(source, /const finalVerifiedIndexes = new Set\(/, 'semantic gate must preserve already-final verified products');
assert.match(source, /if \(finalVerifiedIndexes\.has\(itemIndex\)\) return item;/, 'already verified products must survive downstream semantic failures');
assert.match(source, /visionUrl: `data:image\/png;base64,\$\{normalizedBuffer\.toString\("base64"\)\}`/, 'remote CDN images must be normalized to explicit PNG data URLs before OpenAI vision');
assert.match(source, /image_url: option\.visionUrl/, 'semantic review must use normalized image data, not CDN negotiation URLs');
assert.match(source, /const technicallyResolvedReserves = technicallyResolvedItems\.slice\([\s\S]*?primaryCount[\s\S]*?\);/, 'single-product flow must separate reserves from the primary');
assert.match(source, /items: technicallyResolvedPrimary,[\s\S]*?failClosed: true/, 'primary product semantic review must remain safety-critical');
assert.match(source, /items: technicallyResolvedReserves,[\s\S]*?failClosed: false/, 'reserve semantic review must be non-blocking for single-product posts');
assert.match(source, /resolvedItems = \[\.\.\.resolvedPrimary, \.\.\.resolvedReserves\]/, 'primary and surviving reserves must be recombined without letting reserves poison primary');

console.log('v144.40 product-image gate isolation regression checks passed.');
