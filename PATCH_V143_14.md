# Spreelo v143.14

Built on v143.13.

## Changes

- Keeps the existing country and calendar-campaign reasoning, while skipping the
  optional product-metadata refinement when the main brand analysis already
  returned complete metadata.
- Bounds the optional metadata refinement to 20 seconds with no automatic
  OpenAI retry.
- Prevents filenames such as `_H26_46` from being mistaken for a 26 x 46 pixel
  thumbnail.
- Trusts verified image dimensions and refills a carousel from its existing
  reserve candidates when a selected product image is rejected.
- Fills the final carousel selection from saved reserve items before rendering,
  targeting five product slides. The campaign CTA remains an additional slide.
- Rebuilds the dashboard for desktop, tablet and mobile using the visual system
  from AI Innehållsstudio.

## Deployment

No SQL migration is required. Deploy this source package in the same way as
v143.13.

## Validation

- JavaScript syntax checks passed.
- v143.13 product-image regression checks passed.
- v143.14 analysis, carousel and dashboard regression checks passed.
- Next.js production build passed with Webpack.
- Dashboard was visually checked at desktop, tablet and mobile widths without
  horizontal page overflow.
