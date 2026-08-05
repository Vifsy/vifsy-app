# Spreelo v143.30

## Included

- Durable admin lifecycle for every automation occurrence, including running, background research and terminal repair cases.
- Global review defaults to on, with an inherited per-brand override. Complete trusted-brand posts can be sent directly; failures always remain internal.
- Admin product workbench with add/remove/edit products, signed image uploads, post-copy editing, complete regeneration from frozen admin materials, full carousel preview and soft bulk archive.
- Admin release reuses the previous localized customer approval email. The approval action is primary and “Request changes” is a discrete secondary action.
- Hourly, idempotent admin digest when review or repair items exist.
- Exact configured-host enforcement and verified-pool-first GPT editorial selection. Carousels deliver a verified 3–5 product set instead of accepting dead URLs.
- Reusable calendar visual library capped at 150 assets, generic immediate fallback, missing-theme queue and asynchronous GPT Image worker.
- Read-only analysis result modal with social-channel and recurring-plan next steps.
- AI Studio no longer renders a provisional post set that is replaced by a later authoritative result.
- Unified responsive styling for Brand Profile, Home and calendar-launched AI Studio; customer Home no longer exposes internal generation failures and the Manage buttons were removed.

## Deploy

1. Run `supabase/v143_30_review_workbench_calendar_assets.sql` after the earlier v143 migrations.
2. Deploy the application normally. `vercel.json` adds the hourly review digest and five-minute calendar visual worker.
3. Keep `SPREELO_ADMIN_EMAILS`, `RESEND_API_KEY`, `OPENAI_API_KEY`, `CRON_SECRET`, Supabase values and `NEXT_PUBLIC_APP_URL` configured.
4. Optional: set `CALENDAR_IMAGE_MODEL`. The default is `gpt-image-2`.

## Verification

- `node scripts/test-v143-30-admin-workbench-live-pool.mjs`
- `node scripts/test-v143-25-live-links-open-images.mjs`
- `node scripts/test-v143-26-adaptive-labels-resume-captions.mjs`
- `node scripts/test-v143-27-global-product-typography.mjs`
- `node scripts/test-v143-29-brand-profile-redesign.mjs`
- `next build --webpack` with deployment environment variables available.
