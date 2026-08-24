# Spreelo v144.34 — No Product Prices + Quickbutik Product Proof

## Product price policy

Product prices are no longer part of Spreelo's product-content pipeline.

Removed from production product flow:
- product price extraction from HTML, JSON-LD, meta tags, microdata and Shopify feeds
- product price validation / shipping-threshold heuristics
- product price as a product-confidence signal
- product price from AI website extraction and GPT-5.5 product research schemas
- product price from candidate queues and website product catalog runtime reads/writes
- product price from locked product objects and product content contracts
- product price from post / carousel metadata
- product price fields from the Admin product repair editor and repair APIs

Spreelo still keeps output guardrails that explicitly forbid generated product prices and strip price-like text if a model tries to add it.

Spreelo billing prices and explicit customer-authored campaign discounts are intentionally unchanged.

Legacy Supabase price columns are left in place for backward compatibility, but v144.34 does not select, write, or use them in the product-content runtime. No SQL migration is required.

## Quickbutik / category-style product URLs

Product verification no longer needs a price signal to establish a concrete product page. A page already classified as a product can now satisfy concrete product proof through a verified purchase action plus strong page classification, even when its URL does not contain `/products/` or `/produkt/`.

Commerce page classification was also strengthened for canonical single-product pages with a main image and purchase surface without relying on price metadata.

This targets storefronts such as Quickbutik where direct product URLs can look like:

`/for-henne/vibratorer/lelo-nea-3`

instead of a conventional `/products/...` path.

## Regression coverage

Added `scripts/test-v144-34-no-product-prices-quickbutik.mjs`.

Verified together with v144.30, v144.31, v144.32 and v144.33 regression checks.
