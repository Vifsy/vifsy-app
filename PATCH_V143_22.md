# Spreelo v143.22 - durable carousel integrity

This update keeps the successful GPT-5.5 product-selection method from v143.21 while making long research and technical asset recovery safer.

## What changed

- GPT-5.5 campaign web research now runs as a stored OpenAI background response.
- The response id is persisted per automation occurrence and research round.
- If research is still running, the same occurrence and credit reservation are deferred and resumed by a later worker. No second paid search is started.
- The intended ranks 1-5 are locked. A stale URL or bad shared image is repaired for that exact selected product first.
- If an exact product is truly unavailable, the replacement reserve is selected by the missing product's general campaign role rather than blindly taking the next rank.
- Shared logos/placeholders across different product pages trigger repair.
- An image without verified product identity is never published.
- A final bounded batch review prefers clean product-only catalogue images and rejects images with people, human body parts, animals, unrelated products or logo-only placeholders. If the review service is temporarily unavailable, only identity-verified images remain eligible.
- The implementation is domain-independent and contains no retailer-specific rules.

## Deployment order

1. Run `supabase/v143_22_durable_campaign_research.sql` once in the Supabase SQL editor.
2. Deploy the v143.22 zip in Vercel.
3. No new Vercel environment variable is required.

