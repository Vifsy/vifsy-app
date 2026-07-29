# v143.13 - verified product-image anchor

v143.13 includes all v143.12 and v143.11 changes. It repairs the handoff
between authoritative GPT-5.5 product selection and the existing
largest-product-image resolver.

## Fixed

- A Product.image belonging to the selected Product entity is preferred before
  a generic image inferred from the page markup.
- A tiny image cannot become the visual identity anchor that rejects larger
  product images.
- One image reused by multiple distinct selected product pages is treated as a
  shared site asset and removed before product-image selection.
- The existing generic high-resolution discovery, browser fallback and
  small-customer-image delivery fallback remain enabled.
- No store, domain, platform or customer name is hardcoded.

## Deployment

- No SQL migration.
- No new environment variable.
- Includes the v143.12 brand-analysis session refresh.
- Includes the v143.11 authoritative GPT-5.5 campaign web-agent flow.

## Verification

- `node scripts/test-v143-13-product-image-anchor-fix.mjs`
- `node scripts/test-v143-12-brand-analysis-session-refresh.mjs`
- `node scripts/test-v143-11-authoritative-gpt55-web-agent.mjs`
- `node scripts/test-v142-largest-product-images.mjs`
- full Next.js production build
