# Spreelo v144.20 — Adaptive protected-commerce discovery

v144.20 builds on v144.19 without replacing the existing Product Engine V2, product-identity, image-binding, campaign-curation, no-reuse or GPT Image 2 typography flows.

## Why

Retailers such as Inet can block Spreelo's direct HTML/product requests with 403 or anti-bot protection while current products are still available through public commerce endpoints or indexed official pages. The old flow could therefore either select stale indexed products or end the occurrence with `no_suitable_product` too early.

## New protected-site strategy

For sites classified as protected (HTTP 401/403/406/423/451 or common anti-bot/challenge signals):

1. Keep existing direct/product-source logic for normal sites unchanged.
2. Ignore stale cached stock decisions; product identity may remain cached, but stock must have a recent verification timestamp.
3. Probe authoritative public commerce sources when exposed:
   - Shopify public `products.json`
   - WooCommerce public Store API
4. Only public-feed products explicitly reported `in_stock` become locked current candidates.
5. If public sources are insufficient, use bounded indexed current-assortment research:
   - `stock_first`
   - `stock_broad`
   - `domain_site_search`
6. GPT-5.5 exact repair may replace an obsolete/non-stock indexed candidate only with a current explicitly in-stock product from the same retailer.
7. Direct Store Map/store-search crawling is skipped on domains already known to be protected, avoiding repeated 403 work.
8. If protected research is temporarily inconclusive, the same occurrence is retried automatically instead of immediately becoming a customer-facing terminal failure.

## Stock safety

Physical product promotion still requires exactly `in_stock`.

The following remain ineligible:
- generic `available`
- preorder
- backorder
- beställningsvara/order-only
- 0 stock
- discontinued/out of stock
- unknown stock
- add-to-cart button without positive stock evidence

Fresh stock metadata is persisted separately from long-lived product identity:
- `stock_verified_at`
- `stock_verification_source`
- `stock_verification_evidence`

Default protected-site stock freshness is 2 hours (bounded to 15 minutes–6 hours through `PROTECTED_PRODUCT_STOCK_FRESH_MS`).

## Exact product safety

A customer-selected exact product on a protected site is retried as that exact product if technical verification is temporarily blocked. Spreelo does not silently substitute another item. If a physical exact product is safely identified but not explicitly confirmed in stock, it is not promoted.

## Preserved safeguards

The existing safeguards remain intact:
- exact official-domain product URL
- same-product/same-image binding
- exact original main product image lock
- semantic product-image verification
- fail-closed identity handling
- product reuse limits
- carousel reserve-product requirement
- campaign identity lock / senior selection rules
- GPT Image 2 transparent typography and transparent product assets from v144.18
- v144.19 explicit in-stock-only promotion policy
- generation cost tracking

## Retry contract

Protected-product research uses the existing v144.00 transient retry database function, so **no new SQL migration is required** for v144.20.

The occurrence receives up to four protected-product research retries, each after approximately 3 minutes. Each occurrence-level attempt itself has bounded public-feed/indexed discovery and exact-product repair, so the system gets multiple independent opportunities without allowing unbounded paid research.

## Validation

Passed locally in the supplied project tree:
- Node syntax check for `run-automations/route.js`
- Product Engine V2 helper tests
- polite retrieval / strict no-reuse
- v143.21 authoritative asset repair
- v143.23 canonical product recovery
- v143.57 product identity integrity
- v143.58 exact-product fail-closed recovery
- v143.61 same-page product identity
- v143.62 verified reserve round
- v143.63 final product identity/admin reliability
- v143.64 locked product-page object
- v144.00 delivery-first resilience
- v144.10 indexed 403 fallback
- v144.11 batched 403 fallback
- v144.12 exact generation cost tracking
- v144.13 campaign identity lock
- v144.17 purchasable products / no Kling text
- v144.18 GPT Image transparent assets
- v144.19 in-stock-first selection
- v144.20 adaptive protected-commerce discovery

The v143.97 test could not execute in this unpacked environment because its test script imports Next's Babel parser from `node_modules`, which is not present in the uploaded project archive. No source-code failure was reported by that test; its dependency could not be loaded.
