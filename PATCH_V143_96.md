# Spreelo v143.96 — mandatory admin review and product source links

## Included

- Every newly generated customer post is held in the Spreelo admin review workbench.
- Terminal generation failures remain durable `needs_repair` cases.
- Immediate failure alerts and the hourly review digest use the same admin email list as admin authentication, including `SPREELO_PRIMARY_ADMIN_EMAIL`.
- Every recovered product in the internal admin review UI has an **Open product source** button.
- Failure emails to admins show the same internal product-source buttons when product identity was recovered before the failure.
- Product-source controls were not added to customer emails or generated/published post content.

## Required deployment step

Run `supabase/v143_96_mandatory_admin_review.sql` once in Supabase SQL Editor. This enables the review gate for existing brands as well as new brands.

## Required Vercel variables

- `SPREELO_PRIMARY_ADMIN_EMAIL` — primary recipient and admin login.
- `SPREELO_ADMIN_EMAILS` — optional comma-separated additional admins.
- `RESEND_API_KEY` — required for immediate alerts and the hourly digest.
- `RESEND_FROM_EMAIL` — verified sender used by Resend.
- `NEXT_PUBLIC_APP_URL` — used to create the direct link to `/admin/post-approvals`.
- `CRON_SECRET` — required by the review digest cron.

The hourly `/api/cron/admin-review-digest` schedule remains the backup if an immediate provider request fails.
