# Spreelo v144.2 — clean product-only images

Built on v144.1. It includes all v143.8, v144.0 and v144.1 delivery,
admin-review and exact-product-rerun changes.

## Root cause fixed

The previous animated-product path treated a uniform-corner JPEG as though it
were a safe product cutout. A model-worn product image could therefore pass the
geometry checks, after which color-key background removal deleted parts of the
person or garment.

## Changes

- A bounded final image-safety audit now applies to fetched product images for
  carousels, single products, website text ads and animated products.
- Only clean product-only images are accepted:
  - no real people, faces, hair, hands or other body parts;
  - no animals;
  - no mannequins;
  - no lifestyle, room, outdoor or editorial scenes;
  - the visible product must match the selected product page.
- Product images rejected by the safety audit are replaced by clean products
  from the already prepared reserve pool when possible.
- Uncertain or uninspected images fail closed and are never silently published.
- The audit is one low-detail, bounded `gpt-4.1-mini` request for the final
  selected/reserve batch, rather than one AI call per image.
- Animated products no longer use destructive color-key background removal on
  opaque JPEG/WebP images.
  - True transparent product assets may still be used as cutouts.
  - Opaque product photos are preserved without removing or reconstructing
    product pixels and are placed as a clean source-image frame.
- Product-ad and carousel CTA prompts also forbid people, body parts, animals
  and mannequins.
- Failure diagnostics distinguish:
  - `no_clean_product_only_image`
  - `product_image_safety_unavailable`

## Database

No new SQL is required for v144.2.

## Verification

- `test:v143.8`
- `test:v144`
- `test:v144.1`
- `test:v144.2`
- Next.js 16.2.10 production build with webpack
