import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

// v143.99: a difficult product background may downgrade presentation quality,
// but it must not kill the animated post while the verified source image is
// still downloadable.
assert.match(route, /async function prepareAnimatedProductSafePanel\(/);
assert.match(route, /mode:\s*"safe_original_panel"/);
assert.match(route, /sourcePreserved:\s*true/);
assert.match(route, /generatedProductPixels:\s*false/);

// Exactly one bounded GPT-image edit is available after the fast local cutout.
assert.match(route, /async function createAnimatedProductChromaCutoutFallback\(/);
assert.match(route, /model:\s*IMAGE_MODEL[\s\S]*?quality:\s*"medium"[\s\S]*?background:\s*"opaque"/);
assert.match(route, /\{ timeout:\s*55_000,\s*maxRetries:\s*0 \}/);
assert.match(route, /async function reviewAnimatedProductChromaIdentity\(/);
assert.match(route, /Number\(parsed\?\.confidence \|\| 0\) >= 0\.88/);
assert.match(route, /\{ timeout:\s*20_000,\s*maxRetries:\s*0 \}/);

// Chroma is chosen from the least-conflicting technical color, not merely the
// single dominant product color.
assert.match(route, /async function chooseAnimatedProductChromaKey\(/);
assert.match(route, /nearRatio \* 900 - veryNearRatio \* 2400/);

// The authoritative, already identity-verified image is used first. If local
// cutout and AI both fail, the exact source image becomes a safe panel rather
// than throwing a "no clean image" terminal error.
assert.match(route, /const authoritativeImageUrl = resolveUrl\(/);
assert.match(route, /Animated product local cutout unavailable; trying one bounded AI fallback/);
assert.match(route, /Animated product AI cutout fallback unavailable; preserving original in safe panel/);
assert.match(route, /prepared = await prepareAnimatedProductSafePanel\(sourceImageBuffer\)/);
assert.doesNotMatch(route, /No clean product image with a removable or transparent background was available/);

// OpenAI is threaded into pre-render image preparation and unused reserve
// products stop immediately after one delivery-safe product succeeds.
assert.match(route, /prepareAnimatedReelProductCandidates\(\{[\s\S]*?openai = null,[\s\S]*?ruleId = null,/);
assert.match(route, /selectAnimatedProductImage\(item, \{ openai, ruleId \}\)/);
assert.match(route, /Once one verified product is prepared[\s\S]*?break;/);
assert.match(route, /prepareAnimatedReelProductCandidates\(\{[\s\S]*?openai,[\s\S]*?ruleId: rule\.id,/);

console.log("v143.99 animated product delivery fallback regression checks passed.");
