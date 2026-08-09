import assert from 'node:assert/strict';
import fs from 'node:fs';

const worker = fs.readFileSync('app/api/cron/run-automations/route.js', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const checks = [];
function check(name, condition) {
  assert.ok(condition, name);
  checks.push(name);
}

check('AI placement prompt treats the glass card as mandatory visual identity',
  worker.includes("The visual layout is always compact_card"));
check('Normalized AI placement always becomes compact_card',
  worker.includes('return { placement, layout: "compact_card", textTone, confidence, productBox };'));
check('Local packshot fallback no longer chooses text_only from low variance backgrounds',
  !worker.includes('layout: best.variance < 180 ? "text_only" : "compact_card"'));
check('Non-transparent ecommerce images validate the AI placement against the mapped product box',
  worker.includes('const preferredAllowed = Boolean(preferredPlacement)') &&
  worker.includes('boxesOverlapWithPadding('));
check('Unsafe AI placement gets a safe glass-card corner before controlled overlap',
  worker.includes('ai_bbox_safe_glass_fallback') &&
  worker.includes('chooseNonOverlappingProductLabelPlacement(productCanvasBox, { includeLogo })'));
check('Every rendered carousel label is forced to compact_card',
  worker.includes('appliedLabelAnalysis = { ...appliedLabelAnalysis, layout: "compact_card" };'));
check('Late render rejection triggers placement recovery instead of dropping the label',
  worker.includes('render_safe_glass_fallback') &&
  worker.includes('render_least_obstructive_glass_fallback') &&
  worker.includes('placement_recovered'));
check('Old overlap_rejected terminal label state was removed from final rendering',
  !worker.includes('productLabelReason = "overlap_rejected";'));
check('Final unrecoverable state is explicit rather than pretending the image was safe',
  worker.includes('productLabelReason = "label_render_unavailable";'));
check('Premium glass styling and heavy product typography remain enabled',
  worker.includes('fill-opacity="0.78"') && worker.includes('font-weight="950"'));
check('v143.56 test is registered',
  pkg.scripts?.['test:v143.56'] === 'node scripts/test-v143-56-consistent-carousel-glass-labels.mjs');

console.log(`v143.56 checks passed: ${checks.length}/${checks.length}`);
