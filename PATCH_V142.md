# Patch v142 - largest verified product images

Base: deployed v141.3 (`spreelo-app-main-141.3-delivery-resume-fixed.zip`).

## What changed

- Finds product-image candidates from Product JSON-LD, Open Graph, `img`,
  `picture`, `srcset`, lazy-load, zoom/full-size attributes and rendered product
  galleries.
- Generically checks untransformed/original URLs and larger versions of numeric
  image-size parameters. There are no shop-specific host rules.
- Downloads and decodes candidates before content generation, compares their
  real pixel dimensions and keeps the largest candidate that belongs to the
  selected product.
- Starts one shared headless Chromium session only when static discovery does
  not find a sufficiently large image.
- Keeps the customer's existing small image as a last fallback. A small image
  never blocks post completion by itself.
- Avoids explicit AVIF/HEIF negotiation when downloading images for Sharp.
- Removes paid text regeneration for Reel reserve-product render attempts. The
  selected product is resolved before one content-generation call and rendered
  once.
- Keeps the existing v141.3 social-media canvas sizes and format behavior.

## Deployment

Install the updated locked dependencies and deploy normally.

No SQL migration is required for v142.

The browser fallback is enabled by default. It can be disabled temporarily with
`DISABLE_PRODUCT_IMAGE_BROWSER=1`; no new environment variable is otherwise
required on Vercel.

## New diagnostics

Look for:

`Product image resolver selected largest verified image`

The log includes actual width/height, whether preferred quality was found,
whether the browser fallback was used and whether the customer's small image
was used as the final fallback.
