# v143.62 — Six verified products before carousel delivery

## Goal

Keep the strict v143.61 same-page product identity protection without making a five-product carousel depend on exactly five successful products.

## Delivery contract

For whole-site campaign carousels Spreelo now uses this bounded contract:

- GPT-5.5 requests **10 product candidates per research round**.
- Spreelo requires **at least 6 fully verified products** before the authoritative result is considered ready.
- The first **5** are used for the carousel.
- At least **1 additional verified product** must remain as a reserve.
- If round 1 produces fewer than 6 verified products, Spreelo automatically continues to round 2 when the protected time budget permits it.
- Research remains bounded to **maximum 2 rounds**.
- Previously returned candidate URLs remain blocked in round 2 so the second round searches for complementary replacements instead of returning the same products again.
- If Spreelo still cannot produce 5 verified carousel products + 1 verified reserve, the carousel **fails closed**. It does not weaken the v143.61 identity rules and does not fall back to the legacy 180-candidate flow.

## Diagnostics

The campaign research logs now include:

- `requiredVerifiedProductCount: 6`
- `requiredCarouselProductCount: 5`
- `requiredReserveProductCount: 1`

A dedicated log entry is emitted when an insufficient first round continues to the reserve round.

## Tests

Added:

- `scripts/test-v143-62-verified-reserve-round.mjs`
- `npm run test:v143.62`

The older v143.10/v143.11 source assertions were updated from the old five-product minimum to the new six-product readiness requirement.

No SQL migration required.
