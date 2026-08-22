# Spreelo v144.09 — Kling duration finalization fix

## What changed

- Fixes Kling finalization when Kling returns a fractional duration such as `6.041` seconds.
- Spreelo now normalizes provider duration to a whole number of seconds before saving to the existing integer `posts.video_duration_seconds` column.
- The existing completed Kling task is still reused. The finalizer does **not** submit another Kling generation.

## Deploy

1. Deploy the full v144.09 ZIP over v144.08.
2. No SQL migration is required.
3. No Vercel environment variables need to be changed.
4. Leave the existing Kling task/post in place. The Kling finalizer can pick up the same completed task again and finish the post.

## Regression checks

The v144.09 test covers provider durations `6.041`, `6.0`, and `5.997`, and confirms the finalizer contains no Kling submission call.
