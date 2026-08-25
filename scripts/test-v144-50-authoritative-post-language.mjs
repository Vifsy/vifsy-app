import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  inferContentLanguageFromUrl,
  normalizeSingleContentLanguage,
  resolveContentLanguagePreference,
} from '../lib/contentLanguage.js';

assert.equal(normalizeSingleContentLanguage('Svenska'), 'Swedish');
assert.equal(normalizeSingleContentLanguage('Dansk'), 'Danish');
assert.equal(normalizeSingleContentLanguage('中文'), 'Chinese (Simplified)');
assert.equal(normalizeSingleContentLanguage('日本語'), 'Japanese');
assert.equal(normalizeSingleContentLanguage('Uzbek'), 'Uzbek');
assert.equal(inferContentLanguageFromUrl('https://shop.example.se/products/test'), 'Swedish');
assert.equal(inferContentLanguageFromUrl('https://example.com/sv-se/products/test'), 'Swedish');
assert.equal(inferContentLanguageFromUrl('https://example.com/da-dk/products/test'), 'Danish');
assert.equal(inferContentLanguageFromUrl('https://example.cn/products/test'), 'Chinese (Simplified)');

assert.equal(
  resolveContentLanguagePreference({
    requestedLanguage: 'Auto',
    analyzedLanguage: 'Swedish',
    websiteUrl: 'https://example.com/da-dk/products/test',
  }),
  'Swedish',
  'analyzed customer-facing language must beat an alternate storefront locale when rule language is Auto'
);
assert.equal(
  resolveContentLanguagePreference({
    requestedLanguage: 'German',
    analyzedLanguage: 'Swedish',
    websiteUrl: 'https://example.se',
  }),
  'German',
  'explicit post language must remain authoritative'
);
assert.equal(
  resolveContentLanguagePreference({
    requestedLanguage: 'Auto',
    analyzedLanguage: '',
    websiteUrl: 'https://example.com/zh-cn/products/test',
  }),
  'Chinese (Simplified)',
  'website locale must be the fallback when brand analysis has no language'
);

const route = fs.readFileSync(new URL('../app/api/cron/run-automations/route.js', import.meta.url), 'utf8');
assert.match(route, /function resolveAutomationPostLanguage\(/);
assert.match(route, /rule\.language = resolvedPostLanguage\.language/);
assert.match(route, /rule\.content_language = resolvedPostLanguage\.language/);
assert.match(route, /Content language: \$\{brandProfile\.content_language/);
assert.match(route, /customer-facing overlay copy must come from the[\s\S]*language-locked caption/);
assert.doesNotMatch(route, /descriptorCandidate\s*=/, 'Kling overlay subtitle must not reuse arbitrary storefront descriptors');
assert.doesNotMatch(route, /emmaljunga/i, 'language handling must remain retailer-agnostic');

console.log('v144.50 authoritative post-language checks passed');
