# Spreelo v144.45 — Kling fractional final-duration recovery

## Fix

- Fixes the v144.44 finalization regression where a post-processed duration such as `6.75` was written directly to `posts.video_duration_seconds`, which is an integer column.
- The delivered fractional duration remains preserved in `video_background_selection.delivered_duration_seconds` for accurate post-processing metadata.
- The integer summary column is normalized with the existing `normalizeVideoDurationSeconds()` helper, so a 6.75-second delivered video is stored as `7` seconds there.
- Existing successful Kling tasks in `finalization_retry` are recoverable from the cached Kling source and existing Shotstack render; no second Kling generation is submitted.

## Retry behavior

- The five-minute finalization backoff remains in place.
- Retries reuse the cached `kling_source_url`, typography asset, closing hero frame and `shotstack_render_id`.
- No new paid Kling generation is created by the finalizer.

## Regression coverage

- Strengthens the existing v144.09 fractional-duration test so future post-processing changes cannot write decimals directly into the integer duration column.
