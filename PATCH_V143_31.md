# Spreelo v143.31

## Included

- AI Content Studio shows a complete, goal-specific plan immediately. Changing the goal or post count updates the visible rows without an empty wait or a later visual replacement.
- A compact timezone selector is built into the start-date card without increasing the card height. The browser timezone is selected automatically.
- The regular and calendar-launched studios now share the same responsive glass design while preserving their different planning functions. The template action was removed and the activation section uses a clear completion treatment.
- Brand analysis stays in one modal from active analysis through the read-only result and social-channel next step. Social navigation remains in the same tab, and successful connections receive a localized follow-up modal.
- Home, Brand Profile and Settings use the same full-width background, card system, spacing and responsive rules as AI Content Studio.
- Calendar rows no longer display the redundant planned badge. Expanded campaign information is one focused block, and missing campaign artwork is queued, retried and reused from a maximum 150-image library.
- Admin carousel repair always exposes exactly five product slots. Products can be cleared and replaced with image, title and description; product URL is optional. Regeneration is enabled only when all five products are complete.
- Carousel copy and hashtags are always regenerated. The existing AI closing slide is preserved unless the admin removes it, in which case a new closing slide is generated from the replacement products.
- Product overlays use shorter complete kickers without ellipses, heavier multilingual typography and improved vertical alignment.
- New interface text uses translation keys and the translation cache was refreshed so missing labels can be generated and stored through the existing localization flow.

## Deploy

1. If it has not already been run, apply `supabase/v143_30_review_workbench_calendar_assets.sql` after the earlier v143 migrations. This release adds no additional database migration.
2. Deploy the application normally. Keep the existing five-minute calendar image worker and hourly admin review digest configured from `vercel.json`.
3. Keep `OPENAI_API_KEY`, Supabase values, `RESEND_API_KEY`, `CRON_SECRET`, `SPREELO_ADMIN_EMAILS` and `NEXT_PUBLIC_APP_URL` configured.
4. Optional: set `CALENDAR_IMAGE_MODEL`. The default remains `gpt-image-2`.

## Verification

- `node scripts/test-v143-30-admin-workbench-live-pool.mjs`
- `node scripts/test-v143-31-unified-experience.mjs`
- `next build --webpack` with deployment environment variables available.
