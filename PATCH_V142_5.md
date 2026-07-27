# Patch v142.5 — senior final carousel selection

This patch builds on v142.4.

## Product selection

- Keeps `gpt-4.1-mini` as the inexpensive broad campaign-product screening stage.
- Builds a balanced shortlist of at most 15 verified products across retailer-search sources.
- Requires one comparative final review with `PRODUCT_RESEARCH_MODEL` (`gpt-5.5` by default).
- Treats retailer search queries as discovery clues, not proof of product relevance.
- Requires every final campaign-carousel product to receive a senior score of at least 75.
- Stops the carousel when fewer than five products pass instead of adding a weak fallback.
- Uses only senior-reviewed products as campaign reserves.
- Gives the senior reviewer the complete campaign context and explicit instructions to prefer direct occasion products and avoid repetitive generic categories.

## Product images

- Excludes review, testimonial and user-generated images from product-image candidates.
- Includes generic signals and common review providers such as Judge.me, Loox, Yotpo, Stamped, Trustpilot, Bazaarvoice and PowerReviews.
- Prevents a large customer review photo from replacing a smaller verified main product image.
- Keeps the v142.4 main-gallery preference and existing social-media output dimensions.

## Verification

Run:

```bash
pnpm test:v142.3
pnpm test:v142.4
pnpm test:v142.5
pnpm build
```
