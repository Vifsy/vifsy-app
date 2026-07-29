# Spreelo v144.1 — admin review controls

Built on v144.0 and therefore includes the v143.8 delivery-first campaign
behaviour plus the v144.0 admin review gate and media fixes.

## Changes

- Plan activation buttons no longer become unexplained, unclickable controls
  when the account has too few credits.
  - The credit guard remains in `savePlan`.
  - The page shows the required and available credits.
  - Clicking the button shows the existing full validation message.
- The failed-generation warning on the admin dashboard now opens
  `/admin/post-approvals?status=failed`.
- Failed posts can be inspected with their saved failure details and queued for
  a no-charge admin rerun.
- Admin review supports exact product editing:
  - keep or remove each existing product;
  - open the source product link;
  - add replacement product URLs;
  - regenerate the complete post with the kept and added URL set.
- Carousel slides expose product controls directly on each product image.
  Single-product and animated-product posts expose the current product in the
  product list.
- A regenerated result remains linked to the preceding version and is held for
  admin review.

## Database

No new SQL is required for v144.1. It uses the schema introduced by:

`supabase/v144_admin_post_review_gate.sql`

Run that v144 SQL once if it has not already been applied.

## Verification

- `test:v143.8`
- `test:v144`
- `test:v144.1`
- Next.js 16.2.10 production build with webpack
