# Deploy Spreelo v144.11

## Files
Deploy the complete v144.11 ZIP as the next application version.

## SQL
No new SQL is required.

## Environment variables
No new Vercel environment variables are required.

## Recommended verification
Run the same Inet/Fars dag test used for v144.10.

For a 403-blocked single-product run, the important log sequence is now expected to contain roughly:

1. normal retailer access receives `Website returned 403`
2. one `Product researcher web-search usage`
3. one `Indexed security fallback batch started`
4. one `Authoritative GPT-5.5 exact product asset repair started`
5. one `Authoritative GPT-5.5 exact product asset repair finished`
6. one or more `Indexed exact-product fallback recovered security-blocked website product` entries from that same batch
7. one `Indexed security fallback batch finished` with `modelCallsForExactRepair: 1`
8. no separate GPT-5.5 repair of the selected indexed product later in single-product preparation
9. normal product-image semantic verification and content generation

For a known-403 carousel, look for:
- `Campaign carousel using known-403 indexed product fallback`
- one indexed security batch
- `Campaign carousel completed from one indexed 403 fallback batch` when at least the required exact products pass verification

If a later carousel stage runs, it should reuse the batch and log:
- `Indexed security fallback reused prior batch in the same product preparation run`
- `additionalModelCalls: 0`

## Regression tests run
- Product Engine V2 helper tests
- v143.57 product identity integrity
- v143.61 same-page identity
- v143.62 verified reserve round
- v143.64 locked product-page object
- v143.74 content economics
- v143.99 animated product delivery fallback
- v144.06 premium approval / variety / cover
- v144.07 Kling one-generation guard
- v144.08 social account reconnect
- v144.09 Kling duration finalization
- v144.10 indexed 403 fallback regression
- v144.11 batched 403 fallback checks

Note: the pre-existing v143.67 workspace test still fails on both v144.09 and this branch because the test expects the missing translation key `admin.approvals.regenerateCarousel`; v144.11 did not introduce that failure.
