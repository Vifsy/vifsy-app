# Spreelo Admin

Admin access is intentionally limited to one primary administrator.

- `SPREELO_PRIMARY_ADMIN_EMAIL` — optional override for the primary admin login.
- Default primary admin: `johan@foldern.com`.

The older `SPREELO_ADMIN_EMAILS` / `SPREELO_ADMIN_USER_IDS` values are no longer used to grant access to the admin workspace. They may still be used by notification workflows, but they do not unlock `/admin`.

The sidebar shows **Admin** only after `/api/admin/me` confirms access. The `/admin` route tree also has its own access guard, and every admin API verifies the account server-side.

## Required SQL

Run these files in Supabase SQL Editor:

1. `supabase/video_background_library.sql`
2. `supabase/admin_dashboard_credit_adjustments.sql`

No new SQL is required for v143.71.

## Admin pages

- `/admin` — overview and protected tools
- `/admin/post-approvals` — Spreelo internal review queue, repair queue and admin history
- `/admin/credits` — audited manual credit adjustments
- `/video-backgrounds` — shared 9:16 background library

Customer review is separate from admin:

- `/review?view=queue` — customer-owned posts that have completed Spreelo's internal review and now await the customer's decision
- `/review?view=history` — that customer's approved, published and rejected post history

The credit API uses the service role on the server. Browser clients cannot call the adjustment RPC directly because execute permission is restricted to `service_role`.
