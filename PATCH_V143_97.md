# Spreelo v143.97 — complete admin repair flow

## Included

- Terminal generation errors can be repaired even when the failed run never created a normal `posts` row.
- Admin review opens a manual product form automatically for an empty failed single-product post.
- Admin can either fetch an original product URL or manually provide product name, product text and an uploaded product image when the customer site blocks retrieval.
- Single-product posts and five-product carousels can both be regenerated from the original customer's automation rule, language, platform, format, brand and schedule context.
- Regeneration creates a fresh customer-owned repair draft and attaches it to the original occurrence and durable admin review case.
- Repaired content remains in Spreelo admin review. No customer approval email is sent during regeneration.
- The customer approval email is sent only after **Release to customer** is clicked in Admin → Review.
- Fixed animated-Reel image selection for CDN `srcset` URLs containing comma-separated query parameters. Fake paths such as `/h=320` and `/quality=80` are no longer created.
- The product image that already passed Spreelo's identity verification is now attempted before optional gallery-image fallbacks.

## Deployment

Deploy this package to Vercel in the normal way. No additional SQL migration is required for v143.97 when the v143.30 and v143.96 migrations have already been applied.

The existing `admin-review-assets` bucket from v143.30 is used for manual admin image uploads.

## Verification

Static syntax and regression tests for v143.30, v143.59, v143.63, v143.67, v143.70, v143.96 and v143.97 pass.

The local production build reaches Next.js compilation but cannot complete in this workspace because its existing partial `node_modules` directory lacks Chromium/Puppeteer and Supabase subpackages. These dependencies are declared in the lockfile and are installed by Vercel during a clean deployment.
