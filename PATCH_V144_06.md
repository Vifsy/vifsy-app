# PATCH v144.06

## Files changed

- `app/api/approve-post/route.js`
  - Unified premium approval/TikTok/success design.
  - Preserves `ui_locale` through GET/POST approval flow.
  - Uses translated labels for approval UI and validation messages.

- `app/api/cron/run-automations/route.js`
  - Adds TikTok `video_cover_timestamp_ms` with a 1000 ms default.
  - Adds cross-format product-family/package diversity scoring.
  - Feeds recent product URLs into focused Store Map discovery.
  - Allows single-product discovery to continue to another shelf when needed for variety.
  - Strengthens hard semantic variant-conflict detection for volume/weight/size/quantity/pack-count differences.

- `lib/i18n/defaultLabels.js`
  - Adds English source labels for the redesigned approval experience and TikTok validation/status states.
  - Existing `ui_translation_packs` workflow translates and persists missing locales automatically.

- `scripts/test-v144-06-premium-approval-variety-cover.mjs`
  - Regression coverage for unified approval design, English/i18n wiring, UI-locale continuity, TikTok video cover, product diversity and variant conflict checks.

- `package.json`
  - Adds `test:v144.06`.

## Deliberately unchanged

- Queue worker count and batch size.
- Existing TikTok audit/test-mode restrictions.
- Animated-product cutout fallback behavior.
- Database schema and environment-variable set.
