# Spreelo v143.10 – GPT-5.5 primary domain web research

This release is based on the deployed v143.8 source.

## Campaign carousel flow

1. GPT-5.5 receives one concise task: find ten suitable products from the
   customer's domain for the campaign.
2. The Responses API web-search tool is restricted to that customer domain.
3. GPT-5.5 returns ten ranked direct product pages. Ranks 1–5 are the intended
   varied carousel and ranks 6–10 are ordered reserves.
4. Product Engine verifies those exact pages and extracts their real product
   data and usable product images.
5. When at least five pages pass verification, the five highest-ranked
   verified products are locked immediately. They are not sent through the old
   keyword gates or another senior-review call.
6. Only when fewer than five products pass does the unchanged v143.8
   persistent candidate, retailer search and Store Map flow run.

The successful primary path does not load or inspect the legacy 180-candidate
queue. Recent products are supplied as exclusions and fresh verified products
are placed ahead of unavoidable reuse.

## Deployment

- No SQL migration is required.
- No new API key is required.
- `PRODUCT_RESEARCH_MODEL` continues to default to `gpt-5.5`.
- Optional timeout override:
  `CAMPAIGN_PRIMARY_WEB_RESEARCH_TIMEOUT_MS` (45–75 seconds, default 60).
