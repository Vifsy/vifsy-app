# v143.61 — Same-page product identity lock

## Problem fixed

A carousel could keep the correct product title/URL while using an image from a different product on the same retailer site. The concrete example was Zalando:

- selected product: `Kipling 100 PENS BTS` (pencil case)
- wrong image: `Kipling CLASS ROOM BTS` (school backpack)

The old technical recovery considered a few shared title words sufficient identity evidence and could then use the already-selected image as its own identity anchor.

## Changes

- Product title recovery is now conservative instead of accepting any two shared words.
  - Requires substantial title overlap plus distinctive model/name evidence.
  - Conflicting numeric/model identifiers fail closed.
  - Regression test explicitly rejects `100 PENS BTS` vs `CLASS ROOM BTS`.
- Product hydration now binds **title + product URL + image** to the same product page.
  - A live page whose product title does not match the selected identity is rejected before image hydration.
  - An image URL from the initial web-research result is no longer sufficient by itself.
  - Product JSON-LD/main-gallery images from the exact page are preferred.
- Exact asset recovery now has an explicit same-page contract.
  - Must return `image_source_page_url`.
  - Must assert `image_is_main_product_asset=true`.
  - The source page must canonicalize to the recovered product URL.
  - Stable SKU/article hints take priority over fuzzy title similarity.
- Added support for Zalando-style terminal article codes such as `ki153i011-q11` as stable identity hints.
- The final image resolver refuses to use an unbound authoritative web-agent image as an identity anchor.
- The final resolver independently blocks title/URL mismatches before browser gallery recovery.
- Semantic product-image verification now uses high-detail image input and requires at least `0.90` confidence.

## Safety behaviour

If Spreelo cannot prove that the image belongs to the exact selected product, the product is rejected/repaired/replaced. It must not publish a wrong product image just to complete five carousel slides.

## Tests

Added:

- `scripts/test-v143-61-same-page-product-identity.mjs`
- `npm run test:v143.61`

Relevant regression suites from v143.5, v143.13, v143.20–25, v143.57, v143.58 and v143.60 were also run against the patch.

No SQL migration required.
