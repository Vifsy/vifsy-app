# Patch v142.1 - first-pass delivery and largest verified product images

Base: v141.5 first-pass delivery, which already contains the v141.3 delivery
resume fix and the v141.4/v141.5 Store Map and cost-control changes.

## Included from v141.5

- Saved candidate queues and catalog candidates are used first.
- Store Map runs before broader store and domain searches.
- Specific product shelves are prioritized ahead of broad departments.
- The Store Map budget within one occurrence is 240 seconds.
- The only controlled retry verifies up to 24 saved candidates.
- The hard cost ceiling remains two complete occurrences.
- Image requests avoid explicit AVIF/HEIF negotiation.

## New product-image resolution

- Finds candidates from Product JSON-LD, Open Graph, `img`, `picture`,
  `srcset`, lazy-load, zoom/full-size attributes and rendered galleries.
- Checks generic untransformed/original URLs and numeric image-size parameters
  without customer- or platform-specific host rules.
- Downloads and decodes candidates before content generation, compares real
  pixel dimensions and keeps the largest candidate that belongs to the selected
  product.
- Starts one shared headless Chromium session only when the static page does
  not expose a sufficiently large image.
- Keeps the customer's existing small image as a last fallback, so image size
  by itself never prevents a completed post.
- Resolves the selected product before one paid content-generation call.
  Animated rendering no longer regenerates paid copy for multiple reserve
  products.
- Keeps the existing v141.3/v141.5 social-media sizes and format behavior.

## Deployment

Install the locked dependencies and deploy normally.

No new SQL migration is required if the v141.3 migration has already been run.
No new Vercel environment variable is required.

The browser fallback can be temporarily disabled with
`DISABLE_PRODUCT_IMAGE_BROWSER=1`.

## Diagnostic log

`Product image resolver selected largest verified image`

The event reports actual width and height, whether the preferred quality was
found, whether browser discovery was needed and whether the customer's small
image was used as the final fallback.
