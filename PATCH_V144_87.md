# Spreelo v144.87 — Glass + mobile spacing correction

This release is intentionally narrow. It changes only the visual issues confirmed after v144.86 plus cleanup of obsolete root-level release notes.

## Plan settings / week rhythm
- Removed the opaque white surfaces accidentally applied to inner settings rows/header wrappers by the legacy generic `[class*="card"]` rule. The outer glass card is now the only card surface.
- Restored the Spreelo magic background on mobile so translucent settings surfaces have the same visual context as desktop.
- Made the mobile Plan settings glass more transparent and kept blur/soft border/shadow.
- Made the mobile Week rhythm use the same glass treatment.
- Added equal left/right breathing room to both mobile boxes.
- Added a small vertical gap between Plan settings and Week rhythm.
- No setting controls, scheduling behavior, platform logic, calendar behavior, planned-post UI or other page sections were changed in this release.

## Markdown cleanup
- Removed obsolete historical `DEPLOY_V*.md`, `PATCH_V*.md` and `V*-UPDATE.md` files from the project root.
- Kept `DEPLOY_V143_72.md` and `DEPLOY_V143_73.md` because existing regression tests read them directly.
- Kept lasting documentation such as README, admin/setup, CSS refactor, auth, third-party notices and video/music documentation.

## Database
- No schema or data changes.
- No SQL required for v144.87.
