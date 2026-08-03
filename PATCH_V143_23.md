# Spreelo v143.23 - durable canonical product recovery

This release preserves the authoritative GPT-5.5 carousel ranking from v143.22 and fixes the technical recovery path used when a selected retailer URL has moved or expired.

## Changes

- Exact canonical-URL and product-image repair now uses the same durable OpenAI background job mechanism as the primary campaign search.
- The same automation occurrence and reserved credits resume automatically if URL repair needs longer than one worker invocation.
- A replacement research round receives hard exclusions for every stale URL returned by the preceding round, independent of long product-history lists.
- The web agent must open each returned product page and confirm that it is live rather than relying on an indexed search-result snippet.
- Expected stale reserve URLs are logged as information when delivery remains intact instead of producing duplicate warnings.
- The final clean-product image review receives 30 seconds instead of 15 seconds. If it is still unavailable, the single warning remains visible because that is a real quality safeguard degradation.
- Rate limits and unrecovered delivery failures remain warnings or errors.

## Database

No new SQL is required after `v143_22_durable_campaign_research.sql`. That migration already reserves research slots 1-4; v143.23 uses slots 3-4 for durable canonical repair.
