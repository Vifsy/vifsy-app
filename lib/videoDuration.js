export function normalizeVideoDurationSeconds(...values) {
  for (const value of values) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) continue;
    return Math.max(1, Math.round(numeric));
  }
  return 6;
}
