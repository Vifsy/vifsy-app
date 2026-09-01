# Spreelo v144.82 — Exact Plan Settings + Weekly Rhythm Reference

This release is deliberately limited to the two areas requested in the final reference pass:

1. **Planinställningar**
   - One unified white settings card at every breakpoint.
   - Exact row order: Mål, Inlägg per vecka, Startdatum, Inläggsspråk, Plattform, Publicering.
   - Six evenly structured rows with consistent icon, copy and right-value alignment.
   - Removed the three desktop groups (`STRATEGI / SCHEMA / KANALER & SPRÅK`) from the visual presentation.
   - Removed the bulky value pills. Values are clean right-aligned text with chevrons, matching the supplied reference.
   - Spreelo orange icon treatment on the left.
   - Responsive typography/spacing keeps the same hierarchy on desktop, tablet and mobile without shrinking to micro-text.

2. **Veckovis publiceringsrytm**
   - Reference-style card with a bounded desktop width (does not stretch across the entire workspace).
   - Restored one continuous connector line from Monday through Sunday.
   - Larger, cleaner circles and readable weekday/post-count typography.
   - Semantic color rule remains: 0 posts = neutral, 1 post = purple, 2+ posts = orange, regardless of weekday.
   - Dedicated tablet/mobile sizing preserves the same proportions without crowding.

## Scope / behavior

- No planning logic changed.
- No credit logic changed.
- No publication logic changed.
- No entitlement/package logic changed.
- No Stripe/billing logic changed.
- No database/schema changes.
- **No SQL is required for v144.82.**
- If `spreelo-v144.78-SQL.sql` has not yet been applied in the live Supabase project, it is still required for the package-limit changes introduced in v144.78.
