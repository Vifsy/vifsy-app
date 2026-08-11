# Spreelo Admin

Admin access is controlled by login email addresses configured in Vercel.

- `SPREELO_PRIMARY_ADMIN_EMAIL` — optional primary admin login. Defaults to `johan@foldern.com`.
- `SPREELO_ADMIN_EMAILS` — optional additional admin login emails. Separate multiple addresses with commas, semicolons or new lines.

Every configured admin gets access to `/admin` and is exempt from Spreelo package-capacity limits for businesses, connected social accounts and active rolling plans. AI-credit charging remains unchanged.

The sidebar shows **Admin** only after `/api/admin/me` confirms access. The `/admin` route tree also has its own access guard, and every admin API verifies the account server-side. `/api/admin/me` also synchronizes the admin status to protected Supabase auth app metadata so database plan-limit triggers can apply the same bypass safely.

If an email is removed from the Vercel admin configuration, the app clears its stored bypass status the next time that account loads Spreelo.
