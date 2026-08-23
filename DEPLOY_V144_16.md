# Spreelo v144.16 — Deploy

## Deploy
1. Deploy the full v144.16 ZIP.
2. No SQL migration is required.
3. No new Vercel environment variables are required.

## What this corrects
v144.16 removes the v144.15 generative whole-product/availability hard gate that could create `no_suitable_product` after the ordinary exact-product fallback had already succeeded.

The product/403 path is restored to v144.14 behavior. The safe carousel locale fix and the non-blocking Kling visual/text improvements remain.

## Expected behavior for a 403 retailer
- normal retailer requests may still log HTTP 403
- the existing indexed exact-product fallback handles that condition as before
- there is no second mandatory direct gallery fetch for Kling
- inability to prove a whole-product gallery image no longer terminates the automation

## Kling
- exact verified retailer image remains authoritative
- first frame is large instead of a tiny centered card
- cropped references stay cropped; Kling is explicitly forbidden from completing/inventing missing product areas
- short readable marketing text beta remains enabled
- exactly one paid Kling generation per post remains enforced
