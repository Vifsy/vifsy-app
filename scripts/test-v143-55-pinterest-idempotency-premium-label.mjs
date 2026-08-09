import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');
const typography = fs.readFileSync('lib/globalProductTypography.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('Pinterest duplicate guard has a settling window', worker.includes('PINTEREST_CREATE_SETTLE_MINUTES = 15'));
check('Pinterest stores processing receipts after ambiguous create timeouts', worker.includes('state: "processing"') && worker.includes('last_create_attempt_at: nowIso'));
check('Pinterest processing receipts are persisted immediately', worker.includes('Could not persist Pinterest processing receipt'));
check('Pinterest retries reconcile existing board Pins before another create', worker.includes('Boolean(pinterestProcessingReceipt)') && worker.includes('findExistingPinterestPinForPost'));
check('Pinterest blocks a second create while the first request may still be processing', worker.includes('Pinterest duplicate-create guard active'));
check('Pending Pinterest processing is treated as transient rather than terminal', worker.includes('pinterestProcessingPending = true'));
check('Pinterest carousel still requires multiple images and never falls back to one image', worker.includes('Carousel post is missing at least 2 render-ready slide images') && worker.includes('source_type: "multiple_image_urls"'));
check('Pinterest carousel still publishes at most five product images', worker.includes('.slice(0, 5)') && worker.includes('outroIncluded: false'));
check('Product label uses heavier premium weight', worker.includes('font-weight="950"'));
check('Latin product labels use tighter premium tracking', worker.includes('productLetterSpacing') && worker.includes('"-0.7"'));
check('Glass-card text gets a subtle same-color weight stroke', worker.includes('stroke-width="0.7"'));
check('Product typography starts from a slightly larger display size', typography.includes('const sizes = [46, 42, 38, 34, 31, 28, 25, 22];'));
check('v143.55 test is registered', pkg.scripts?.['test:v143.55'] === 'node scripts/test-v143-55-pinterest-idempotency-premium-label.mjs');

console.log(`v143.55 checks passed: ${checks.length}/${checks.length}`);
