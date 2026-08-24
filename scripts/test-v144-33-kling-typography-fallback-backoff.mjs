import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/cron/finalize-kling-videos/route.js', import.meta.url), 'utf8');
const nextConfig = fs.readFileSync(new URL('../next.config.mjs', import.meta.url), 'utf8');

function must(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message || `Missing: ${needle}`);
}

must(route, 'KLING_FINALIZATION_RETRY_BACKOFF_MS = 5 * 60 * 1000', 'Finalization failures need bounded backoff');
must(route, 'finalizationRetryBackoffIsFresh(post) && !hasRecoverableTypographyFailure(post)', 'Retry loop must back off but allow immediate repair of an already-failed typography state');
must(route, 'text_overlay_provider: "deterministic-svg-transparent-fallback"', 'A no-AI exact-text fallback is required');
must(route, 'return createDeterministicKlingTypographyFallback({', 'Failed AI typography must recover through deterministic fallback');
must(route, 'if (status === "failed")', 'Persisted failed typography state must be repairable');
must(route, 'text_overlay_fallback_reason', 'Fallback reason should remain observable');
must(route, 'Kling typography AI unavailable; deterministic transparent fallback created', 'Fallback should be visible in logs');
must(route, 'cached result will retry after backoff', 'Generic local failures should not be hammered every minute');
must(nextConfig, '"/api/cron/finalize-kling-videos*"', 'Kling finalizer tracing must be explicit');
must(nextConfig, '"assets/fonts/**/*"', 'Bundled global fonts must be available to deterministic typography fallback');

const imageEdits = [...route.matchAll(/openai\.images\.edit\(/g)].length;
if (imageEdits !== 1) throw new Error(`Expected exactly one paid GPT-Image-2 typography call site, found ${imageEdits}`);
const klingPolls = [...route.matchAll(/getKlingImageToVideoTask\(/g)].length;
if (klingPolls !== 1) throw new Error(`Expected exactly one Kling polling call site, found ${klingPolls}`);

console.log('v144.33 Kling typography fallback/backoff regression checks passed');
