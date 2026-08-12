# Deploy v143.93 — Threads OAuth foundation

## 1. Supabase
Run once in Supabase SQL Editor:

`supabase/v143_93_threads_oauth.sql`

## 2. Vercel environment variables
Add these as **Sensitive**, for Production and Preview:

- `THREADS_APP_ID` = the **Threads app ID** from Meta for Developers
- `THREADS_APP_SECRET` = the **Threads app secret** from Meta for Developers
- `THREADS_REDIRECT_URI` = `https://app.spreelo.com/api/auth/threads/callback`

Do not reuse `META_APP_ID` or `INSTAGRAM_APP_ID`; Threads has its own app ID inside the same Meta developer app.

## 3. Meta Threads settings
After this version is deployed, configure:

- Redirect Callback URL: `https://app.spreelo.com/api/auth/threads/callback`
- Uninstall Callback URL: `https://app.spreelo.com/api/auth/threads/uninstall`
- Delete Callback URL: `https://app.spreelo.com/api/auth/threads/delete-data`

If Meta's Redirect Callback URL field shows the typed URL but still refuses Save, select/confirm the URL entry in the field (or press Enter) so it is registered as a valid redirect URI.

## 4. Tester
Use **Add or Remove Threads Testers** in Meta for Developers and add the public `spreeloapp` Threads profile. Accept the invitation from that Threads account before testing OAuth.

## 5. Verify
Open Spreelo → Social channels → Threads → Connect Threads. A successful flow returns to:

`/social-channels?connected=threads`

After OAuth succeeds, Threads becomes selectable in new Spreelo content plans and the existing publisher can send image, carousel and AI-video posts to Threads. Start with a simple single-image test post before enabling a recurring plan.
