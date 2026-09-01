# Spreelo v144.92 — Product Research URL Normalization Fix

## Fixed

- Fixed a terminal runtime failure in the single-product web-research fallback in `app/api/cron/run-automations/route.js`.
- The fallback referenced `normalizeUrlForComparison(...)`, a helper that did not exist anywhere in the project.
- The two invalid calls now use Spreelo's existing product URL normalization pipeline:
  - `canonicalizeWebsiteProductUrl(...)`
  - `normalizeComparableValue(...)`
- Selected web-research products and remaining candidates therefore use the same canonical comparison key before the selected item is removed from the pool.

## Why this mattered

The product researcher could successfully verify real products and then crash while removing the selected product from the candidate pool. The surrounding error handling subsequently reported `no_suitable_product`, even though verified products had already been found.

## Scope

- No UI changes.
- No billing or credit changes.
- No scheduling changes.
- No database/schema changes.
- No SQL required.

## Regression coverage

Added `scripts/test-v144-92-product-research-url-normalization.mjs` to verify that:

1. the undefined helper is no longer referenced;
2. both selected and candidate URLs use the existing canonical/comparable normalization path;
3. equivalent URL variants deduplicate to the same comparison key.
