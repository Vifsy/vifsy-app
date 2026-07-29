# Spreelo v144.0 – admin review, video identity and carousel safety

Built directly on the deployed v143.8 baseline.

## Included

- Optional global Spreelo-admin quality gate. It is disabled by default, so
  the existing customer approval flow remains unchanged until an admin turns
  it on.
- Exact post preview in Admin > Post approvals for image, video, carousel,
  caption and hashtags.
- Admin approve, reject and no-charge regenerate actions.
- Optional exact product URLs for a regenerate. URLs are restricted to the
  customer's own website and work for carousel, single-product and animated
  product content.
- Revision comparison shows the previous and new post side by side.
- Admin rerun failures stay inside admin review and do not send a failure
  message or charge another credit to the customer.
- Animated product videos now keep the verified high-resolution product image
  tied to the selected product and no longer inspect three unused reserve
  products before rendering.
- Animated product images may be safely framed when background removal is not
  reliable, avoiding a failed post or an unrelated substitute product.
- Shotstack polling has enough time for a normal render after the removed
  preprocessing delay.
- Product discovery prioritizes actual product-detail URLs and discards
  retailer search/filter URLs before verification.
- Product-schema images are preferred before broad page galleries, reducing
  title/image mismatches from recommendation widgets.

## Database

Run this new migration once:

`supabase/v144_admin_post_review_gate.sql`

It creates the optional settings/review tables and the rerun metadata columns.
The migration seeds the feature as OFF. Old migrations do not need to be run
again when v143.8 is already deployed.

## Verification

- Production build: passed (`next build --webpack`)
- `test:v144`: passed
- `test:v143.8`: passed
- `test:v142`: passed
- `test:v140`: passed
