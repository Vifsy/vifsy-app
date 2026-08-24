# Spreelo v144.38 — Verified Product Lock Fallback

## Problem fixed
A Store Map run could verify several current website products and still fail the occurrence when the selected Quickbutik product did not expose the narrower JSON-LD/OG structure required by the later locked-product step.

## Changes
- Exact product-page locking now accepts the same safe main-gallery evidence used by Product Engine V2 when the exact page is classified as a product.
- Current purchase-action evidence is preserved into the locked product object.
- Quickbutik-style `available` candidates are allowed through research handoff for technical verification instead of being discarded before the page verifier runs.
- Store Map single-product flow now tries the next already-verified product when one exact page cannot be locked.
- Fresh Store Map products do not trigger GPT-5.5 exact-product repair just to rediscover the same current product.
- GPT repair availability semantics now accept either explicit `in_stock` or `available` with an observed current purchase action and no negative availability signal.
- Product prices remain removed.

## Deployment
- No SQL migration.
- No new environment variables.
