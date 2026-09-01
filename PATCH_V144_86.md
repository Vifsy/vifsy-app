# Spreelo v144.86 — Targeted UI corrections

This release is intentionally narrow and corrects only the UI issues confirmed after v144.85.

## Plan settings
- Fixed the custom platform picker so it can actually be opened and changed on desktop, tablet and mobile.
- Replaced the v144.85 settings stylesheet instead of stacking another competing settings layer.
- Restored clearly rounded, genuinely translucent glass cards on desktop/tablet.
- Reduced desktop control height and reduced value font weight so controls do not compete with headings.
- Mobile helper copy is slightly larger.
- Mobile rows now have consistent separators.
- Mobile start date no longer renders as a unique pill; it aligns with the other right-side values.
- Mobile Plan settings and Week rhythm use the same available width.
- Mobile start-date calendar is no longer constrained to the narrow value column.

## Weekly rhythm
- White text is enforced on purple/orange desktop segments for contrast.
- Existing scheduling behavior and color logic are unchanged.

## Planned posts
- Expanded action area no longer has an outer tray/frame around the two action buttons.
- The colored left rail now continues through the expanded action area.
- The expanded area inherits the post tone so it no longer looks abruptly cut off.
- On mobile, social destination icons no longer sit inside small white pill backgrounds.

## Not changed
- No billing or Stripe logic.
- No credit logic.
- No package/entitlement logic.
- No publishing or scheduling behavior.
- No database/schema changes.
- No SQL required for v144.86.
