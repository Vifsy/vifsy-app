# Spreelo v143.99 — delivery-safe animated product cutout

## Goal
A difficult product background must no longer stop an animated product post when Spreelo already has a verified, downloadable product image.

## New bounded delivery chain
1. Use the exact product image that already passed Spreelo's product identity gates.
2. Try the existing fast/local background removal.
3. If that fails, make **one** bounded GPT-image-2 edit that changes only the background to a technical chroma color.
4. Compare the AI edit against the authoritative source with a strict visual identity gate.
5. Remove the chroma background.
6. If the AI edit, identity review or chroma removal is unusable, preserve the exact original source image inside a clean floating product card and continue the Reel.

The fallback order is deliberately quality-first but delivery-safe: **cutout → AI cutout → exact-source panel**.

## Timeout/cost protection
- Only one GPT-image fallback is attempted for a product.
- GPT-image edit is bounded to 55 seconds, no automatic retry.
- Identity review is bounded to 20 seconds, no automatic retry.
- Once one verified product has a delivery-safe presentation, Spreelo stops preparing reserve products that would never be rendered.
- Product discovery is not restarted by the fallback.

## Product integrity
- GPT-image-2 gets the exact verified product image as its reference.
- The prompt explicitly forbids changing silhouette, color/variant, logos, printed text/design, number of items, hardware or hidden product details.
- A separate visual identity check must approve the edit at >= 0.88 confidence.
- If that check is unavailable or rejects the edit, Spreelo uses the untouched source image panel instead.

## Deployment
- No SQL migration.
- No new environment variables.
- Deploy the complete v143.99 project normally on Vercel.
