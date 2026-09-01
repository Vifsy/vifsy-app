# Spreelo v144.84 — Glass Plan Settings + Weekly Rhythm

## Scope
Only the **Planinställningar** and **Veckovis publiceringsrytm** presentation layer is changed.
No planning, scheduling, credit, entitlement, billing, Stripe, publication or database behavior is changed.

## Desktop
- Keeps the existing three logical groups: **STRATEGI**, **SCHEMA**, **KANALER & SPRÅK**.
- Reintroduces Spreelo's frosted/glass surface: translucent white, backdrop blur, soft border and shadow.
- Keeps two rows in each group and aligns values in consistent glass controls.
- Weekly rhythm becomes a bounded horizontal glass strip with a compact title area and seven segmented days.
- Weekly rhythm is capped at 1220px rather than stretching across an unlimited desktop width.

## Tablet
- Same glass design family.
- Reflows to two cards plus a full-width third card when three columns would become too narrow.
- Weekly rhythm stacks only on compact tablet widths.

## Mobile
- Keeps one six-row Planinställningar card.
- Uses a deterministic two-column row grid so labels and right-side values stay aligned.
- Restores the frosted/glass surface without sacrificing readability.
- Weekly rhythm uses the friendly circle/check presentation with a continuous connector line.

## Weekly rhythm semantic colors
- 0 posts: neutral/grey.
- 1 post: purple.
- 2+ posts: orange.

## Database / SQL
No SQL is required for v144.84.
The v144.78 package SQL is still the relevant package-entitlement migration if it has not already been applied.
