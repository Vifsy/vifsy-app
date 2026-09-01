# Spreelo v144.76 — billing readability polish

This patch keeps the approved v144.75 billing layout and improves legibility without changing the design structure or billing behavior.

## Readability changes
- Increases secondary text throughout plan cards so it is readable at normal desktop zoom.
- Enlarges billing cadence labels and helper text.
- Enlarges plan subtitles, billing notes, feature rows, fit descriptions and CTA labels.
- Enlarges extra-credit descriptions, prices, buttons and footer/link text.
- Enlarges the shared-benefits rail text and icons.
- Gives the credit explainer more vertical breathing room and larger heading/body/detail text.
- Enlarges the subscription status/cancel utility text.
- Keeps mobile cadence text readable instead of shrinking to micro-text.
- Slightly increases card/rail heights where necessary so larger text never needs to be compressed.

## Functional safety
- No Stripe handlers changed.
- No subscription/proration logic changed.
- No credit balance logic changed. Balances can still exceed the monthly plan allowance (for example 1500 / 500 or 1190 / 750).
- No database/schema changes.
- No SQL required.
