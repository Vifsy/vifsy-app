# Spreelo v144.19 – In-stock-first product selection

## Why
v144.17/144.18 could still overfit product discovery to old indexed product pages on 403-protected retailers. It also treated preorder/backorder/generic orderability as confirmed purchasability, even though some retailers keep an add-to-cart button visible for zero-stock order items.

## Changes
- Physical product promotion now requires explicit `in_stock` status.
- `available`, preorder, backorder, beställningsvara/order-item, unknown and add-to-cart-only states are not sufficient stock proof.
- Known 403-protected stores use an availability-first current-assortment pass followed, if needed, by a broad current in-stock delivery pass. The old stale-prone exact best-match pass is not used for known-403 domains.
- The authoritative GPT-5.5 repair may replace a stale/unknown/non-stock indexed candidate with a relevant current product when, and only when, the replacement is explicitly in stock.
- Availability outranks obsolete exact-model/spec matching in the 403 fallback.
- The bounded 403 fallback can make two research/repair passes instead of one.
- Exact repair default timeout is raised from 35 seconds to 90 seconds (bounded by the overall occurrence deadline).
- Directly readable product pages are no longer accepted for promotion merely because an add-to-cart button exists; explicit current stock proof is required.

## Delivery principle
Spreelo should choose the best campaign fit from the retailer's *current in-stock assortment*, not choose the closest indexed product first and ask about stock afterward.
