# v143.45 — Pinterest connection reliability

This release fixes the remaining Pinterest save failure and makes Pinterest OAuth durable enough for customer use.

## Important database step
Run `supabase/v143_45_pinterest_connection_reliability.sql` in Supabase SQL Editor **before deploying v143.45**.

The migration:
- allows `pinterest` in `social_connections.platform` (and future-proofs the text/check-constraint variant for the selected Spreelo channel set),
- adds server-side refresh-token and connection-health columns,
- adds an index used by background token maintenance.

The v143.44 error `Pinterest was authorized, but Spreelo could not save the connection` happened after Pinterest OAuth/token/account lookup succeeded and the persistence step failed. v143.45 fixes both common legacy-schema blockers:
- Pinterest was not necessarily allowed by the existing `social_connections.platform` constraint/enum.
- the temporary board-selection row no longer uses a new `pending` status value; it uses a non-active existing status until a board is selected.

## Durable connection behavior
- Stores Pinterest access + continuous refresh token server-side.
- Stores both access-token and refresh-token expiry times.
- Refreshes access before expiry and rotates the continuous refresh token.
- Daily health/refresh cron at `/api/cron/refresh-pinterest-tokens`.
- Board API also refreshes proactively and retries once after Pinterest authentication failure.
- A previously working Pinterest board is kept active while a replacement OAuth/board selection is in progress.
- If Pinterest authorization can no longer be refreshed, Spreelo marks the connection as requiring reconnection and sends the existing internal social-connection alert email.
- Transient provider/network errors are recorded without immediately disconnecting the customer.

## Pinterest OAuth scopes
- `user_accounts:read`
- `boards:read`
- `boards:write`
- `pins:read`
- `pins:write`

## Existing environment variables
No new Pinterest environment variables are required beyond:
- `PINTEREST_APP_ID`
- `PINTEREST_APP_SECRET`
- `PINTEREST_REDIRECT_URI=https://app.spreelo.com/api/auth/pinterest/callback`

The existing `CRON_SECRET` and `RESEND_API_KEY` are reused for background maintenance and internal alerts.
