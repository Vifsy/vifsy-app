# Spreelo v143.97b — global srcset safety fix

## Included

- Extends the v143.97 animated-product `srcset` fix to the shared product-image resolver.
- Extends the same fix to both rendered-image and `<picture><source>` collection paths in the headless product-image browser.
- CDN URLs such as `?w=1600,h=1600,quality=85,fit=pad` are kept intact instead of being split into fake image candidates like `/h=1600`, `/quality=85` or `/fit=pad`.
- Keeps the v143.97 animated-Reel behavior where the already verified selected product image is attempted before optional gallery fallbacks.
- Adds a dedicated regression test covering all three `srcset` parsing paths.

## Deployment

Deploy the complete package to Vercel in the normal way. No SQL migration and no new environment variables are required for v143.97b.

## Verification

Run `npm run test:v143.97b`. The test verifies that all product-image `srcset` parsers preserve comma-containing CDN query parameters.
