# Spreelo v142.4 – verified product main gallery

This patch is intentionally limited to product-image discovery. The market and
country URL flow is unchanged and can be handled separately.

## What changed

- Once a page is technically verified as a real product page, the main product
  gallery is accepted as stronger identity evidence than words in the image
  filename.
- Opaque CDN and SKU image filenames no longer need to repeat the product title
  or the numeric product URL.
- Main-gallery candidates are ranked before the previous conservative filename
  fallback.
- Generic width hints such as `width=1200`, `w=1200`, `size=w900`, and common
  width path patterns are understood during early gallery selection.
- If a verified product page has no usable image in its raw HTML, Spreelo uses
  the existing bounded rendered-page fallback and inspects the rendered main
  gallery.
- A search/listing thumbnail can be kept as the final fallback after the target
  page itself has supplied direct product proof. The later image-resolution
  pass can then replace it with the largest verified gallery asset.
- Rendered image ranking now uses visible image area and ancestor context.
  Images inside related, recommended, similar, recently viewed, cross-sell, and
  upsell regions are strongly penalized.
- The static HTML context no longer allows a later recommendations section to
  contaminate the score of an earlier main-gallery image.

## Safety

The new regression test includes:

- a correct main-gallery image with an opaque SKU filename;
- a larger image inside a related-products section;
- verification that the main-gallery image wins;
- verification that rendered recommendations are penalized.

All prior v140–v142.3 product, queue, retry, Store Map, search, and image
regression tests remain included.

## Deployment

Deploy the complete v142.4 zip over v142.3.

No SQL migration or new environment variable is required.

