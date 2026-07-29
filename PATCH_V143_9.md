# Patch v143.9 – bounded carousel set diversity

This patch keeps the deployed v143.8 search, verification, queue, image,
timeout and reduced-delivery behaviour intact. It changes only the final
selection made from already verified campaign products and reserves.

## Changes

- Selects the best five-product set instead of the five highest independent
  product scores when equally relevant product types are available.
- Penalizes repeated product types softly, so specialist stores can still
  deliver five similar products when no broader assortment exists.
- Treats colour and size variants of the same named product as one product
  family at final selection.
- Never uses a weaker campaign-delivery tier solely to create variation.
- Allows the existing reduced carousel fallback when too few distinct product
  families remain.
- Adds no network requests, browser work, image analysis or OpenAI calls.

## Deployment

No SQL or environment-variable change is required.
