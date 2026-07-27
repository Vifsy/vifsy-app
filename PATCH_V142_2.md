# Spreelo v142.2 — Generic product-page verification

## Purpose

This patch prevents modern headless product pages from being rejected merely
because they also contain recommendation cards. It is domain-neutral and keeps
the v141.5 delivery flow and v142.1 high-resolution image resolver unchanged.

## Changes

- Fixes false Magento detection caused by the loose `mage/` substring matching
  normal `/image/` asset paths.
- Recognizes common article-ID `.html` product URLs without hard-coding a
  retailer domain.
- Gives canonical URL, product metadata, price/SKU microdata, primary image,
  product schema and purchase signals precedence over recommendation cards.
- Uses a limited rendered-page verification fallback for ambiguous,
  product-looking pages.
- Stops verification after six consecutive unresolved ambiguous pages instead
  of requesting dozens of pages with the same failed method.
- Deduplicates candidate-queue rows after canonicalization before Supabase
  upsert, preventing duplicate-conflict batches.

## Safety and cost

- Maximum rendered verification probes default to 6 and can be configured with
  `RENDERED_PRODUCT_VERIFICATION_LIMIT` (0–8).
- Set `DISABLE_RENDERED_PRODUCT_VERIFICATION=1` to disable rendered
  verification independently.
- Existing domain cooldown, retry ceiling, terminal refund and image-quality
  fallback behavior are unchanged.

## Database

No new SQL migration is required.

## Verification

Run:

```bash
pnpm test:v142.2
pnpm test:v140
pnpm test:v141
pnpm test:v142
pnpm build
```
