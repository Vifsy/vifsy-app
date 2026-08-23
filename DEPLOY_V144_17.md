# Spreelo v144.17 – Purchasable Products + No Kling Text

## Deploy
1. Replace the existing app files with the full v144.17 package.
2. Deploy normally to Vercel.
3. No SQL migration is required.
4. No new environment variables are required.

## What to verify after deploy
Run one normal product-video test against a retailer that previously returned 403 (for example Inet).

Expected behavior:
- Direct 403 attempts may still appear in the log.
- The indexed 403 fallback should still use one paid GPT-5.5 exact-repair batch.
- The exact repair now verifies current purchase availability on the official product page.
- A product explicitly marked discontinued/out of stock must not be returned for the post.
- If the originally indexed product is unavailable, the SAME GPT-5.5 repair request may replace it with another currently purchasable, relevant product from the same official retailer domain.
- The replacement must still have exact same-page title/product/image binding.
- Kling must not create new readable overlay text.
- A successful run should end with generated: 1 and errors: 0.

## Important
v144.17 does NOT reintroduce the v144.15 whole-product-image hard gate or the terminal `no_suitable_product` generative-reference failure path.
