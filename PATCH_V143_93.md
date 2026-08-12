# Spreelo v143.93

- Threads is now a first-class connection on **Social channels** with the existing Spreelo brand/account model.
- Adds Threads OAuth start + callback using the official Threads authorization flow and the scopes `threads_basic` + `threads_content_publish`.
- Exchanges the short-lived Threads token for a 60-day long-lived token and stores it server-side in `social_connections`.
- Adds automatic Threads token refresh through `/api/cron/refresh-threads-tokens`.
- Adds real provider callbacks for Threads deauthorization and Meta data-deletion requests.
- Adds a public deletion-status endpoint for Meta's deletion callback response.
- Adds automatic Threads publishing in the existing durable publisher for text/image posts, AI video posts and image carousels.
- Threads publishing uses the official container → `threads_publish` flow and preserves per-platform publish receipts so retries do not duplicate already-published targets.
- Threads text is bounded to the platform's 500-character limit at publish time.
- Adds `supabase/v143_93_threads_oauth.sql` so `threads` is allowed whether `social_connections.platform` is an enum or a text/check column.
