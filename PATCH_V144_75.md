# Spreelo v144.75 — final billing reference polish

This patch implements the approved Plan & billing desktop reference on top of v144.74 without changing Stripe, credit, database, or entitlement logic.

## UI changes
- Centers Monthly/Yearly cadence above the three plan cards.
- Restores Starter, Growth and Pro as three exactly equal-width/equal-height cards.
- Keeps Pro softly highlighted with Spreelo peach/coral instead of a hard dark block.
- Restores the extra-credit purchases as a narrower right-side rail on desktop.
- Adds consistent icons to the shared-plan benefits rail.
- Keeps the shared-plan benefits rail navy and the credit explainer below it light.
- Moves subscription status/cancel controls to a quiet footer utility area so they do not disturb the approved reference composition.
- Adds tablet/mobile breakpoints that avoid compressed desktop columns and horizontal overflow.

## Functional safety
- Existing Stripe checkout, upgrade/downgrade, cadence switch, proration and cancel/resume handlers are unchanged.
- Credit balance logic is unchanged. Balances may exceed the monthly plan allowance (for example 1500 / 500).
- No SQL or database migration is required.
