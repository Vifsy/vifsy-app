# Spreelo v143.33

## Included

- Campaign images now use a language-independent English `visual_theme_key` and English reusable tags while campaign titles remain in the customer's language. Vietnamese `Giáng sinh`, Swedish `Jul` and Spanish `Navidad` therefore share the canonical `christmas` theme.
- Existing campaign opportunities, queued requests and stored visual assets are backfilled with canonical metadata. Existing Storage filenames do not need to be renamed.
- Reuse requires a meaningful canonical match. An unrelated image is never selected merely because the library is full; Spreelo uses the generic campaign image when no safe match exists.
- OpenAI image generation now requires an atomic database reservation. Stored assets plus active reservations can never exceed 150, including concurrent cron runs. At capacity, Spreelo reuses the library and does not call OpenAI.
- Product formats consistently say that products are selected from the customer's website. Service formats explicitly state that no website product is selected. Every format that generates an AI image says so.
- Timezone is compactly embedded in the Start date card without changing the equal height of the six setting cards.
- Planned-post columns are aligned, purpose chips are quieter, helper copy is readable, and the Add post action is right-aligned.
- Mobile planned-post cards, channel icon, purpose, credits, menu and complete description have a dedicated compact layout. The activation and ongoing-plan sections no longer collapse into a narrow left column.
- Calendar-launched AI Content Studio keeps the previous focused campaign feature set. The regular content-type browser is hidden in campaign mode, while the page uses the same background, glass cards and full width as the regular studio.
- Brand Profile and Dashboard now use the same full-width rounded glass system, layered gradients and soft shadows as AI Content Studio.

## Deploy

1. Apply `supabase/v143_33_global_calendar_visual_library.sql` after the v143.30 and v143.32 visual-library migrations.
2. Deploy the application normally.
3. Keep the existing `/api/cron/generate-calendar-visuals` schedule and environment variables.

## Verification

- `node scripts/test-v143-30-admin-workbench-live-pool.mjs`
- `node scripts/test-v143-31-unified-experience.mjs`
- `node scripts/test-v143-32-experience-correction.mjs`
- `node scripts/test-v143-33-global-visuals-studio-polish.mjs`
- `next build --webpack`
