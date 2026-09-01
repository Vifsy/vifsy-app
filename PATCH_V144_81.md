# Spreelo v144.81 — Studio precision polish

## AI Content Studio

### Planned posts
- The `Publiceras till` destination band now inherits the same soft color family as the post's left accent rail.
- The existing four-color post variation is preserved.
- No post scheduling, cost or publishing behavior changed.

### Planinställningar
- Mobile settings now follow the supplied single-card/six-row reference more closely.
- Removed the bulky lavender value pills that made the rows look uneven.
- Increased row consistency, title/helper readability and value alignment.
- Setting icons, chevrons and the date interaction icon now use Spreelo orange.
- Existing controls and interactions are unchanged.

### Veckovis publiceringsrytm
- Rebuilt the visual timeline to match the supplied cleaner reference:
  - larger desktop/tablet typography
  - larger, cleaner circles
  - more balanced vertical spacing
  - no cramped inner panel
- Color is now based only on post count:
  - 0 posts = neutral gray
  - 1 post = purple
  - 2+ posts = orange
- Weekend position no longer affects color.

## Billing / package behavior
- v144.80 scheduled downgrade undo remains included.
- v144.78 package/credit/per-brand limits remain unchanged.
- Credit balances remain uncapped and may exceed the monthly plan allowance.

## Database
No new SQL is required for v144.81.
If `spreelo-v144.78-SQL.sql` has not yet been run, it is still required for the v144.78 entitlement changes.
