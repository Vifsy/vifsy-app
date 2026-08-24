# Spreelo v144.40 — Product Image Gate Isolation

## Root cause fixed
v144.39 successfully locked the selected product and its exact same-page image, but later combined that already-verified primary product with reserve products in one fail-closed OpenAI vision request. If any reserve/CDN image was delivered in a format OpenAI could not decode, the whole batch was marked failed — including the already-verified primary product.

## Changes
- Already final semantic-verified product images are preserved and excluded from later semantic review batches.
- Single-product primary image review is isolated from reserve-product review.
- Reserve-image semantic verification is non-blocking for a single-product post.
- Remote CDN images are fetched and normalized locally to explicit PNG data URLs before OpenAI vision review, preventing `auto=format` content negotiation from returning unsupported AVIF/HEIF or malformed content to OpenAI.
- Semantic review uses only the technically selected exact image per product instead of redundant CDN variants.
- A semantic-provider failure can no longer overwrite a previously verified product image.
- Product prices remain removed.

## Deployment
- No SQL migration.
- No new environment variables.
