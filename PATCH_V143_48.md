# Spreelo v143.48 — Campaign review + Pinterest publishing

## Campaign plan experience
- Wider campaign-plan canvas aligned with AI Content Studio proportions.
- New responsive campaign hero assets for desktop, tablet and mobile.
- New wide AI Content Studio hero asset.
- Fixed campaign date/time picker clipping with explicit overflow and z-index handling.
- Removed the misleading “show full plan” help trigger.
- Added a compact help button beside the content-type chips.
- Updated campaign help copy to match the current flow: recommended timing, per-post unlock, removal before activation, review and approval before publishing.
- Three-dot menu on each campaign row now offers post details and Remove post.
- Added confirmation before removing a planned campaign post.
- Added a post-activation summary modal with actions for Home, another campaign, or ongoing content.

## Pinterest publishing
- Pinterest is now included in the approved-post publishing worker.
- Added Pinterest board connection lookup per brand.
- Added automatic access-token health check and forced refresh/retry on Pinterest auth errors.
- Added organic single-image Pin publishing.
- Added organic multi-image Pin publishing using `multiple_image_urls`.
- Pinterest multi-image publishing is capped at five images. Spreelo campaign/product carousels that contain five product slides plus an outro slide publish the first five carousel slides to Pinterest.
- Added Pinterest publishing health/failure counters and connection-expiry alert handling.

## Database
No new SQL migration is required for v143.48. The Pinterest connection/token schema from v143.45 remains the required database baseline.
