# Deploy Spreelo v143.82

1. In Supabase SQL Editor, run `spreelo-v143.82-SQL.sql`.
2. In Vercel, keep `SPREELO_PRIMARY_ADMIN_EMAIL` for the primary admin and put any additional admin login emails in `SPREELO_ADMIN_EMAILS` (comma-separated is recommended).
3. Deploy the complete v143.82 project.
4. Sign in with an admin account and let the app load once. `/api/admin/me` will synchronize the admin bypass to Supabase.
5. Verify the admin account can create more businesses/social connections/rolling plans than its paid package limit.
6. Verify a normal customer is still stopped by the package-limit modal and database trigger.

Credits remain governed by the normal credit system for admins.
