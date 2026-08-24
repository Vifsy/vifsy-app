# PATCH V144.27

## Fixes

### Kling AI product video: remove half-baked opening background
- Added a hard post-process trim for Kling product videos so the final rendered ad no longer starts on the static setup/composite frame.
- The Shotstack post-process now trims the first ~0.7 seconds (configurable) before the final delivery render.
- Transparent GPT-Image-2 typography is still used, but it is now timed against the trimmed clip.

### Stronger Kling motion prompt guardrails
- Tightened the Kling prompt so the video must enter believable in-scene action immediately.
- Explicitly forbids lingering on a staged/composited first frame.

## Technical details
- `lib/shotstack.js`
  - `buildVideoOverlayEdit()` now supports `trimStartSeconds`.
- `app/api/cron/finalize-kling-videos/route.js`
  - Applies the trim during the typography post-process.
  - Persists trim/timing metadata on the post.
- `app/api/cron/run-automations/route.js`
  - Stores default trim + overlay timing for Kling posts.
  - Adds stricter opening-scene instructions to the Kling motion prompt.
