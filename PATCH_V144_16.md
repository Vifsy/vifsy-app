# Patch v144.16 — Restore delivery-first fallback + keep safe Kling/locale improvements

## Why this version exists
v144.15 added a new whole-product/availability preflight for generative product media. In production testing against a 403-protected retailer, that preflight could terminate an otherwise valid automation with `no_suitable_product` after the normal exact-product fallback had already succeeded.

v144.16 removes that regression and restores the v144.14 product-selection/fallback behavior as the source of truth.

## 1. Removed v144.15's blocking whole-product gate
Removed from the automation and admin regeneration paths:
- `prepareGenerativeProductReferenceCandidates`
- the visual `full_product_visible` hard gate
- the hard `discontinued/out_of_stock` generative rejection
- terminal `generative_product_reference` failure after only primary + reserve candidates
- the new direct gallery dependency introduced for that gate

A verified product/reference image is no longer discarded merely because Spreelo cannot prove that the whole physical product is visible.

## 2. Restored the proven v144.14 403/product fallback behavior
The normal product flow is again the v144.14 flow:
- direct retailer path first
- existing indexed exact-product 403 fallback when needed
- existing identity lock and semantic image verification
- existing reserve behavior
- no new post-verification gallery requirement

The v144.15 candidate-count shortcut was also removed so the known working fallback chain is not changed for cost reasons.

## 3. Kept the carousel locale fix
`lib/globalProductTypography.js` still canonicalizes locale values before `Intl.Segmenter`.
Malformed/human-readable language values fall back safely instead of causing `Incorrect locale information provided`.

This is local rendering only and does not add AI usage.

## 4. Kept the improved Kling first-frame composition, but made it crop-safe
The old tiny centered landscape card is still removed.

The first frame now:
- uses only the already verified retailer image pixels
- attempts a local pixel-preserving cutout
- otherwise shows the unchanged official image large
- uses a neutral generated backdrop, not a blurred duplicate product image
- does not AI-redraw or invent product pixels

Crucially, v144.16 no longer assumes the source image shows the whole product. If the retailer image is cropped, those same visible boundaries are authoritative.

## 5. Kept stronger Kling creative direction + readable text beta
Kling still receives:
- faster first-second hook / pattern interrupt
- stronger environmental action and final payoff
- short readable marketing text beta
- max two short non-factual overlay phrases
- no prices, discounts, specs, dates, stock claims or fake logos
- campaign identity lock

The product prompt now explicitly says never to extend/complete a cropped reference or invent unseen product areas.

## 6. One paid Kling generation remains unchanged
No retry loop was added. The existing atomic `claim_kling_video_generation` guard and single runtime `submitKlingImageToVideo(...)` call remain intact.

## Files changed from v144.14
- `app/api/cron/run-automations/route.js` — only Kling first-frame/prompt/text-beta changes
- `lib/globalProductTypography.js` — locale hardening
- `scripts/test-v144-16-no-generative-hard-gate.mjs` — regression guard
- docs

`app/api/admin/post-approvals/regenerate-product/route.js` is restored to the v144.14 behavior exactly.

## Database / environment
- No SQL migration.
- No new Vercel environment variables.
