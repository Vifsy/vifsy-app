# Spreelo v144.08 — TikTok/YouTube brand reconnect fix

## What changed

- TikTok and YouTube now reuse an existing `social_connections` row for the same external account/channel when that account is moved from one Spreelo brand to another.
- This fixes PostgreSQL error `23505` / `social_connections_user_platform_page_unique` after disconnecting an account from one brand and connecting it to another.
- TikTok OAuth now uses `disable_auto_auth=1` so the authorization screen is shown instead of silently reusing a previous TikTok session.
- YouTube OAuth now uses `prompt=consent select_account` so Google explicitly offers account selection while still requesting offline access.
- A defensive duplicate-key race fallback re-reads and updates the existing external-account row instead of failing the callback.
- YouTube keeps a durable refresh token from the same external channel row if Google omits a new one during reconnect.

## Database

No SQL migration is required for v144.08. The existing unique constraint is correct and is intentionally preserved.

## Deploy

1. Deploy the full v144.08 project.
2. No environment-variable changes are required for this fix.
3. Test TikTok and YouTube by disconnecting the account from one brand and connecting it to another.
4. Confirm the new brand shows the connection and Vercel logs contain no `23505` duplicate-key callback errors.

## Regression test

Run:

```bash
npm run test:v144.08
```
