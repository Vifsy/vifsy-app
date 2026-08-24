import fs from 'node:fs';

const route = fs.readFileSync(new URL('../app/api/cron/finalize-kling-videos/route.js', import.meta.url), 'utf8');

function must(haystack, needle, message) {
  if (!haystack.includes(needle)) throw new Error(message || `Missing: ${needle}`);
}

must(route, 'KLING_FINALIZATION_LEASE_MS = 6 * 60 * 1000', 'Finalizer needs an overlap lease');
must(route, '.eq("updated_at", post.updated_at)', 'Finalizer claim must use compare-and-swap on updated_at');
must(route, 'video_status: "finalizing"', 'Claim must mark the row finalizing');
must(route, 'finalizationLeaseIsFresh(post)', 'Fresh in-flight finalization must be skipped');
must(route, 'kling_source_url', 'Successful Kling source must be persisted for retries');
must(route, 'provider_cache_hits', 'Cached provider result reuse should be observable');
must(route, 'task = getCachedKlingSource(post)', 'Retries must prefer the cached Kling source');
must(route, 'if (!task.cached)', 'Kling source should only be cached after a real provider poll');
must(route, 'video_status: "finalization_retry"', 'Post-processing failure must leave a retryable state');
must(route, 'isKlingTaskSuccessful(providerStatus)\n              ? "finalizing"', 'Successful provider result must stay locked while post-processing runs');

const klingCalls = [...route.matchAll(/getKlingImageToVideoTask\(/g)].length;
if (klingCalls !== 1) throw new Error(`Expected exactly one provider polling call site, found ${klingCalls}`);

console.log('v144.31 Kling single-flight/cache regression checks passed');
