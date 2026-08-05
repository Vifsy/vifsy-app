export const ANALYSIS_VISUAL_DURATION_MS = 4 * 60 * 1000;
export const ANALYSIS_VISUAL_MAX_PROGRESS = 99;

export function getSmoothAnalysisProgress(startedAt, now = Date.now()) {
  if (!startedAt) return 1;

  const elapsedMs = Math.max(0, now - startedAt);
  const ratio = Math.min(1, elapsedMs / ANALYSIS_VISUAL_DURATION_MS);

  // One calm, linear movement is easier to trust than a fast climb followed by
  // a long artificial crawl through 96–99 percent.
  return 1 + ratio * (ANALYSIS_VISUAL_MAX_PROGRESS - 1);
}
