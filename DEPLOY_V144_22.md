# Deploy v144.22

Deploy this full package instead of v144.21.

## Required setup

- No new Supabase migration.
- No new Vercel environment variable.
- Existing v144.20/v144.21 database state and environment variables are sufficient.

## After deploy — recommended smoke checks

1. Re-run the Inet/protected-retailer carousel that previously stayed in background research.
   - If five exact in-stock image-verified products are available, the carousel should proceed without waiting for a sixth reserve.
   - The logs should show a protected delivery target of 5 / reserve requirement 0.
2. While a durable research response is genuinely still pending, open the normal admin review queue.
   - The occurrence should now be visible as creating/retrying instead of the queue looking empty.
3. Switch the UI to French (or another non-Swedish locale) from Settings.
   - The language endpoint should no longer request every namespace in one call.
   - A slow translation chunk should abort after 6.5 seconds and retry later rather than produce a 60-second Vercel 504.
4. Confirm the v144.21 UI fixes remain present: dashboard planned-post counts/dropdowns, expanded timezone list, calendar polish and readable bottom-of-studio text.

## Important unchanged safety rules

- Physical products still require explicit `in_stock` status.
- Product URL, product identity and original image identity remain fail-closed.
- Normal retailers still require a verified reserve product for campaign carousels.
- No generic invented product is published to hide a product-research failure.
