# Spreelo v143.53 — Pinterest carousel reliability

## What changed
- Pinterest product carousels publish the five product slides only; the AI outro is never included when Pinterest's five-image limit is reached.
- Pinterest create-pin timeouts, including `_upload_pin_to_s3`, are treated as transient processing states instead of terminal failures.
- Retry attempts reconcile the selected board before creating another Pin. The existing `utm_content=<post id>` marker lets Spreelo identify a Pin created by an earlier timed-out request and prevents duplicates.
- Transient Pinterest failures keep retrying with bounded exponential backoff (up to hourly) rather than becoming terminal after five attempts.
- Per-platform publish progress is persisted immediately. If a multi-platform post succeeds on Facebook but Pinterest is temporarily unavailable, Facebook is not published twice during the Pinterest retry.
- Provider receipts are stored for diagnostics, including Pinterest Pin IDs.

## Required SQL
Run `supabase/v143_53_reliable_social_publish_targets.sql` once before deploying this version.

## Pinterest behavior
The publisher still uses the current `PINTEREST_API_ENV`. Keep `sandbox` while the Pinterest app has Trial access.
