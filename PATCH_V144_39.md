# Spreelo v144.39 — Universal Reliable Product Lock

This version combines the strongest parts of both v144.38 approaches instead of choosing one and regressing the other.

## Reliability changes
- Keeps the verified Store Map pool and tries the next verified product if one product cannot be locked.
- Keeps deterministic locking for freshly verified Store Map products without paying GPT-5.5 to rediscover the same product.
- Keeps Quickbutik/current-page `available + active purchase action + no negative stock signal` support.
- Adds universal schema-less/custom/headless page locking through the shared conservative commerce classifier (product page, confidence >= 78), without retailer-specific URL assumptions.
- Keeps JSON-LD, product metadata and exact-page gallery image sources; category/search/campaign/article/API/listing pages remain rejected.
- Exact same-page locked product images that pass the deterministic image resolver no longer go through a second AI vision comparison. This removes a redundant cost/latency/false-negative failure point. Legacy or unbound images still use the semantic AI gate.
- Product prices remain removed from the product runtime.

## Deployment
- No SQL migration.
- No new environment variables.
