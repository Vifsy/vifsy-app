# Spreelo v143.82 — unlimited admin capacity

- Every email configured as a Spreelo admin in Vercel now bypasses the package caps for businesses, connected social accounts and active rolling plans.
- Supported Vercel variables: `SPREELO_PRIMARY_ADMIN_EMAIL` plus comma/semicolon/newline separated `SPREELO_ADMIN_EMAILS`.
- The primary admin still defaults to `johan@foldern.com` when `SPREELO_PRIMARY_ADMIN_EMAIL` is not set.
- `/api/admin/me` synchronizes the Vercel admin decision to protected Supabase auth app metadata so database triggers can safely bypass the limits for admins while continuing to hard-enforce them for customers.
- Removing an email from the Vercel admin list clears the bypass the next time that account loads Spreelo and `/api/admin/me` runs.
- AI credits are unchanged; this update only removes the three package capacity limits for admins.

Run `spreelo-v143.82-SQL.sql` in Supabase before deploying v143.82. The SQL includes the v143.81 entitlement definitions, so it is safe to run whether or not v143.81 SQL has already been applied.
