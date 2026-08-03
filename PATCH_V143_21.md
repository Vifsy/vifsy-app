# Spreelo v143.21 — authoritative product asset repair

This patch keeps the successful GPT-5.5 campaign-product selection introduced
in v143.11 and the durable analysis recovery from v143.20. It changes only the
technical recovery used when an already selected product has a stale/blocked
page or no usable image.

## Changes

- Replaces the retailer's rate-limited internal search fallback with one
  bounded GPT-5.5 web-search repair request.
- Searches for the exact selected title plus stable product/SKU hints.
- Accepts only a current canonical product URL on the configured retailer and
  the same market, with title or stable-ID evidence for the same product.
- Retrieves the official direct product-image URL without changing product
  rank, role, reason or campaign selection.
- Treats HTTP 404/410 product links as stale even when an indexed image still
  exists, so dead links are not published.
- Preserves the normal second GPT-5.5 selection round when fewer than five
  products remain.
- Uses the actually available request budget instead of requiring a fixed
  90-second window, while reserving time for final post creation.
- Counts only GPT-5.5 research rounds that really executed in logs/errors.

## Deployment

Deploy the zip normally. No SQL migration and no new required environment
variable are needed. `CAMPAIGN_PRIMARY_ASSET_REPAIR_TIMEOUT_MS` is optional;
the bounded default is 35 seconds.
