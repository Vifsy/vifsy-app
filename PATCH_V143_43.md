# v143.43 — Pinterest OAuth trial connection

Adds Pinterest as a third live Social channels connection alongside Facebook and Instagram.

## Included
- Pinterest card on `/social-channels`.
- OAuth Authorization Code flow using Pinterest API v5.
- Signed, short-lived OAuth state cookie for CSRF protection.
- Requested scopes: `boards:read`, `boards:write`, `pins:read`, `pins:write`.
- Pinterest account token stored server-side in existing `social_connections.page_access_token`.
- Board picker after OAuth, including friendly empty-state for new Pinterest accounts with no boards.
- Selected Pinterest board stored as the brand's active Pinterest connection.
- Pinterest-specific connection/error/status copy and styling.

## Vercel environment variables required
- `PINTEREST_APP_ID`
- `PINTEREST_APP_SECRET`
- `PINTEREST_REDIRECT_URI=https://app.spreelo.com/api/auth/pinterest/callback`

## Pinterest developer configuration required
Add this exact redirect URI in My apps → Spreelo → Configure:
`https://app.spreelo.com/api/auth/pinterest/callback`

## Current scope
This release is intentionally focused on validating OAuth + board selection first. Automated Pinterest publishing and continuous refresh-token storage/rotation should be added after the connection has been verified end-to-end in the deployed app.
