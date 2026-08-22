# Spreelo v144.06 – Premium approval, product variety and TikTok cover

## Deployment

Deploy the full v144.06 package in the same way as the previous full Windows packages.

- No Supabase SQL migration is required.
- No new Vercel environment variables are required.
- Existing TikTok environment variables and audit/test-mode settings remain unchanged.
- Queue worker count and batch-size behavior are unchanged in this release.

## Included changes

### Unified premium approval experience
- The general Review & Approve view, TikTok approval view and approval/success pages now share the same Spreelo visual system.
- The layout follows the premium review design: branded top bar, status pill, three-step progress indicator, large media preview, structured detail cards and consistent primary CTA styling.
- TikTok remains a separate final approval/settings step and does not block other selected channels.

### English source copy + automatic translations
- Approval-flow source labels are English.
- New labels are routed through the existing server UI translation system.
- Missing locale labels are translated once, persisted in `ui_translation_packs`, and reused on later requests.
- `ui_locale` is preserved through the approval forms so the UI language does not accidentally switch to the post-content language.

### TikTok video cover
- Video posts now send `post_info.video_cover_timestamp_ms`.
- Default cover timestamp is 1000 ms, giving TikTok a deliberate frame instead of relying on an arbitrary/default profile cover.
- The selected cover timestamp is also stored with TikTok publish settings and logged before initialization.

### Cross-format product variety
- Recent product history is now used across single-image/product-ad/animated-video selection instead of only protecting exact URLs.
- The selector applies soft penalties for repeating the same broad product family and packaging type too soon.
- Store Map can continue to another shelf for a single-product post when the first shelf is dominated by the same recently used family.
- This remains a ranking preference rather than a hard ban so specialist stores can still publish their core product family.

### Stricter product variant identity
- Semantic verification now treats visible size, weight, volume, capacity, pack-count and quantity conflicts as hard variant mismatches.
- Numeric unit conflicts such as 591 ml vs 473 ml are explicitly detected.

## Verification completed

- Node syntax checks passed for the modified approval route, automation route and default-label file.
- Regression tests `test:v144.00` through `test:v144.06` passed.
- A full Next.js production build was not run as part of this packaging pass.
