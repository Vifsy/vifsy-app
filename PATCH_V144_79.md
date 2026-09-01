# Spreelo v144.79 — Final billing polish

This release is intentionally visual-only and builds on v144.78.

## Final polish

- Increased readability in the dark “Included in all plans” rail without changing its layout.
- Increased the small explanatory copy in the credit information section.
- Increased secondary text in the extra-credit rail slightly.
- Refined the shared “per brand” clarification so it reads as one intentional note rather than repeated package noise.
- Made the subscription status and cancellation controls at the bottom look like deliberate account controls rather than tiny metadata.
- Increased the renewal footnote slightly.
- Preserved the approved Starter / Growth / Pro card design, proportions, colors, pricing selector and responsive stacking.

## No logic changes

- No Stripe handler changes.
- No plan price changes.
- No package entitlement changes from v144.78.
- No credit logic changes.
- No credit balance cap was introduced; purchased/accumulated balance may exceed monthly allowance.
- No database/schema changes.
- No new SQL is required for v144.79 itself. The v144.78 SQL is still required if it has not already been applied.
