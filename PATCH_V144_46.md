# Spreelo v144.46 — Single-product verified-pool lock fallback

## Fix

- A single-product post no longer fails just because the first selected verified product cannot be converted into Spreelo's strict locked-product object.
- The fix covers both the explicit `product_category` / `focus_page` path and the store-search path that produced the Emmaljunga `Double SENTO TWIN` failure.
- Spreelo now removes only the failed candidate and selects the next eligible verified product from the same source/pool.
- The loop is bounded by the already configured focused verification limit and never searches outside the selected source.
- Website rate limiting still aborts/defer-retries immediately instead of hammering the remaining pages on a cooling-down domain.

## Cost behavior

- Each verified candidate is first locked deterministically with `allowAiRepair: false`.
- GPT-5.5 repair is not paid for product #1 while product #2/#3/etc. may already work normally.
- Only after the deterministic verified pool is exhausted does Spreelo make one bounded AI-repair attempt on the original best candidate.

## Failure behavior

- `no_suitable_product`/terminal failure is now reached only after the eligible verified pool has been exhausted (plus the single bounded repair attempt).
- Logs include candidate index, failed product URL/title, number of prior lock failures, and the final pool-exhaustion code `FOCUSED_PRODUCT_LOCK_POOL_EXHAUSTED`.

## Regression coverage

- Adds `scripts/test-v144-46-focused-product-lock-fallback.mjs` to ensure focused-category single-product selection retries alternative verified products before AI repair or terminal failure.
- Adds `scripts/test-v144-46-store-search-product-lock-fallback.mjs` to cover the actual Emmaljunga-style store-search path and ensure a rejected first product cannot escape the local retry loop.
