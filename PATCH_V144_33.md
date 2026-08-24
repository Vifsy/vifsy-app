# v144.33 — Kling typography fallback + retry backoff

## Why
A completed Kling task could enter an endless one-minute finalization loop after the single GPT-Image-2 typography generation had failed. The post was marked `finalization_retry`, but the persisted `text_overlay_status: failed` deliberately prevented another paid image generation, so every cron invocation failed in exactly the same place.

## Changes
- Keep the one-paid-GPT-Image-2-attempt rule.
- If that typography attempt fails, immediately generate an exact transparent text overlay locally with Sharp/SVG and bundled Noto fonts. This fallback has no AI cost.
- Existing posts already stuck with `text_overlay_status: failed` are repaired by the deterministic fallback on the first finalizer run after deploy.
- Stale `generating` typography claims also recover to the local fallback instead of becoming permanent.
- Generic local post-processing failures now use a five-minute retry backoff instead of being hammered once per minute.
- Finished Kling source caching and single-flight finalization from v144.31 remain unchanged, so a completed Kling task is not regenerated and should not be re-polled after its source URL has been cached.
- `assets/fonts/**/*` is included in the Kling finalizer bundle so the global deterministic fallback can render non-English scripts using the bundled font set.

## No migration
No SQL migration and no new environment variable are required.
