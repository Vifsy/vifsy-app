# Spreelo v144.83 — Plan Settings + Week Rhythm Correction

This release is deliberately limited to the two areas requested after v144.82.

## Planinställningar
- **Desktop/tablet is restored to the exact pre-v144.82 layout.** v144.82's all-breakpoint six-row flattening is removed from the active CSS cascade, so the established three-card desktop layout (`STRATEGI`, `SCHEMA`, `KANALER & SPRÅK`) from v144.81 is used again without a new desktop redesign.
- **Mobile only** uses the straight unified six-row layout from the supplied reference.
- Mobile rows have equal height, larger/rebalanced typography, consistent icon/value alignment, orange Spreelo icons/chevrons, no bulky value pills, and stable ellipsis for long platform values.

## Veckovis publiceringsrytm
- Desktop width is bounded to 900px (820px in mid-size widths), so the axis does not stretch across the whole workspace.
- One continuous connector line runs behind all seven circles.
- Circle, weekday and post-count sizes are balanced to the supplied reference without becoming oversized.
- Semantic colors remain: 0 = neutral, 1 post = purple, 2+ posts = orange, regardless of weekday.
- Mobile keeps the same design system with readable sizes and a continuous line.

## Scope
- No planned-post design changed.
- No content-type design changed.
- No planning logic changed.
- No billing/Stripe logic changed.
- No credit/package logic changed.
- No database/schema changes.
- No new SQL is required for v144.83.
- `spreelo-v144.78-SQL.sql` is still required only if it has not already been applied.
