# Spreelo v144.31 — Kling single-flight finalizer + completed-source cache

Built directly on v144.30. No SQL migration and no new environment variable.

## Why
Production logs showed that the one-minute Vercel cron could overlap itself when a Kling finalization took longer than one minute. Two invocations then processed the same post concurrently and queued two Shotstack renders. Before the Chromium deployment fix, the same already-successful Kling task was also polled again every minute while local finalization kept failing.

## Changes
- Added a six-minute finalization lease using the existing `video_status`, `kling_last_polled_at`, and `updated_at` fields; no schema change is required.
- Claiming is atomic: the post row is updated only when its `updated_at` still matches the value read by that invocation. Concurrent cron runs therefore cannot both claim the same post.
- While a post is actively post-processing it remains `video_status = finalizing`, so the next one-minute cron skips it.
- A stale/crashed finalizer becomes reclaimable after six minutes.
- Once Kling reports success, its returned source URL and duration are persisted into `video_background_selection` (`kling_source_url`, `kling_source_duration_seconds`, etc.).
- Any later post-processing retry uses that cached source and does not keep polling Kling for a task already known to be complete.
- Local post-processing failures move to `finalization_retry`; they do not create another Kling generation.
- Added observability counters for locked/skipped rows and provider-source cache hits.

## Cost/safety effect
- Prevents overlapping cron runs from double-queuing the normal Shotstack render for the same post.
- Prevents repeated Kling status/result calls once the successful source has already been obtained.
- Keeps the existing one-generation-only Kling rule and one-generation-only GPT-Image-2 typography rule intact.
