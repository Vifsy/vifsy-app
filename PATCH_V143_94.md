# Spreelo v143.94 — Social OAuth popup flow

## Why
New Instagram users could be moved completely away from Spreelo during the first Instagram login. In some cases Instagram showed the normal Instagram feed after login, so the user had to manually find Spreelo again and start the connection a second time.

## What changed
- Facebook, Instagram, Pinterest and Threads OAuth now open in a separate popup/window instead of replacing the Spreelo tab.
- Spreelo stays visible behind the provider login and waits for the result.
- OAuth callbacks now finish through `/social-channels/oauth-complete`, which securely notifies the original Spreelo window with `postMessage` and closes the popup.
- If a browser does not preserve `window.opener`, the completion page falls back to the old full-page redirect, so mobile/private-browser flows are still usable.
- Instagram gets a dedicated first-login recovery message. If Instagram only shows the normal feed after the first login, the customer can click **Continue connection** in Spreelo. Spreelo reuses/reopens the OAuth window and resumes authorization without making the customer hunt back to the app.
- If the popup is closed too early, Spreelo keeps a clear resume state instead of silently stopping.
- Facebook Page selection and Pinterest board selection stay inside the OAuth window and return to the original Spreelo window after the final choice.
- Swedish critical-flow labels were added directly so the recovery UI is immediately understandable in Swedish.

## Database / environment
No SQL migration and no new environment variables are required for v143.94.

## Regression safety
- Popup blocker fallback keeps the previous same-tab redirect behavior.
- Existing signed state cookies, OAuth scopes, token exchange and connection persistence are unchanged.
- v143.93 Threads checks still pass.
- `scripts/test-v143-94-social-oauth-popup.mjs` validates the new popup/callback contract.
