# Spreelo v144.30 — reliable Kling finalization + one-time global i18n

Built directly on v144.29. No SQL migration and no new environment variable.

## Kling delivery
- Removed the blocking finished-video GPT-4.1-mini product/surface audit from finalization. Product/view safety remains enforced before the single paid Kling submission.
- Reduced GPT-Image-2 typography art-direction sampling from four finished-video frames to two representative frames.
- Added `@sparticuz/chromium` (including pnpm layout) to `outputFileTracingIncludes` for `/api/cron/finalize-kling-videos*`, fixing missing `chromium/bin`/brotli files in that Vercel function.
- Existing Kling task IDs and generated typography assets continue to be reused; no automatic second paid Kling generation was added.

## UI translations
- English remains the only source/default UI pack (`DEFAULT_UI_LOCALE = "en"`).
- Removed the Swedish built-in runtime override. Every non-English locale now follows the same persisted `ui_translation_packs` path.
- Translation packs are read from Supabase first; OpenAI is called only for missing/changed keys (or an explicit admin refresh), then results are persisted.
- A timeout/network/provider failure is deferred without an immediate bounded repair call. The repair pass is reserved for individual labels that failed validation after a successful OpenAI response.

## Result
- No finished-video vision audit can falsely fail a paid Kling video.
- Kling finalization has its required Chromium binaries in the correct Vercel route.
- A normal repeat visit does not pay to translate already-persisted UI keys again, for Swedish or any other supported locale.
