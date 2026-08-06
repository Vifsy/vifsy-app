# Spreelo v143.32

## Included

- Timezone is now a compact control above the settings grid. It no longer overlaps Platform or changes the equal height of the six setting cards.
- Planned-post rows use Date and time, Post, Purpose, Channel and Cost. The redundant Format and Planned-status columns were removed from the initial plan view.
- Content-type descriptions explain what the post actually creates. Strategic purpose is displayed as sales-focused, relationship-building, educational, trust-building or engagement.
- Small helper copy in the ongoing and activation area was enlarged. The activation card now has an explicit light-green completion treatment.
- Brand analysis uses a Spreelo-styled animated mark, coral progress treatment, focused current stage and completed-step indicators.
- Non-English workspaces no longer fall back to visible English when a translation request temporarily fails. Missing translations stay in a loading state and retry; new Swedish critical-flow labels are included locally and the translation cache is refreshed.
- Brand Profile is a compact read-only intelligence summary. Editing opens a dedicated modal with complete fields. Changing the website always requires a new analysis before saving.
- Calendar placeholders now vary by campaign theme, including gaming, sustainability, office, winter and technology. The image worker processes up to four jobs per run.
- Calendar visual requests are tied to the exact campaign opportunity rather than broad slug matching. Each generated image is assigned only to its intended campaign.
- Calendar-launched campaign planning now uses the same real AI Content Studio shell, background, cards, post rows and completion section as regular planning while keeping campaign-specific data and controls.

## Deploy

1. Apply `supabase/v143_32_calendar_visual_request_targets.sql` after `supabase/v143_30_review_workbench_calendar_assets.sql`.
   The migration also queues existing campaigns that still use the generic calendar image; customers do not need to run brand analysis again.
2. Deploy the application normally.
3. Keep the existing `/api/cron/generate-calendar-visuals` schedule from `vercel.json`. One invocation can now process four themes instead of one.
4. Keep `OPENAI_API_KEY`, Supabase values, `CRON_SECRET`, `RESEND_API_KEY`, `SPREELO_ADMIN_EMAILS` and `NEXT_PUBLIC_APP_URL` configured.

## Verification

- `node scripts/test-v143-30-admin-workbench-live-pool.mjs`
- `node scripts/test-v143-31-unified-experience.mjs`
- `node scripts/test-v143-32-experience-correction.mjs`
- `next build --webpack` with deployment environment variables available.
