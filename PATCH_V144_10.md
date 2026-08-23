# Spreelo v144.10 — Indexed exact-product fallback for 403-blocked stores

## Goal
Add one isolated fallback for single-product posts when the retailer blocks Spreelo's direct HTML/product-page fetch with HTTP 403/security protection.

## Existing behaviour left unchanged
- Normal direct store/product retrieval still runs first.
- Store Map, catalog, store search, campaign carousel, OAuth, publishing, Kling, Shotstack, billing and all other existing paths are unchanged.
- The new fallback defaults to OFF inside the shared web-product researcher and is enabled only by the existing single-product preparation path.
- HTTP 429/domain cooldown behaviour remains unchanged.

## New fallback
When a web-research candidate is a real product URL on the configured retailer domain but the direct product-page verification receives 403/security blocking:

1. Use OpenAI hosted web search restricted to the retailer's official domain.
2. Search the exact product identity/title plus stable article/SKU hints from the product URL.
3. Open the indexed official product result through the hosted web-search path.
4. Recover the canonical official product page and the direct main-product image attached to that same product block.
5. Require same-page binding, product identity evidence and `image_is_main_product_asset=true`.
6. Convert the result to Spreelo's existing locked-product object.
7. Continue through the existing product-image resolver, which downloads the exact recovered image asset before generation.

The fallback never asks an image model to recreate or redraw the product.

## Safety
- Maximum 3 indexed fallback attempts per web-product research run.
- Wrong-domain, category/search, non-product, mismatched identity, unbound image and guessed-image recoveries are rejected.
- If an exact product + exact official image cannot be recovered, Spreelo still fails closed instead of inventing a product.

## Database
No SQL/database migration is required.
