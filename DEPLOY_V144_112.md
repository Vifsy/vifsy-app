# Deploy Spreelo v144.112

## 1. SQL

**No new Supabase SQL migration is required for v144.112.**

The release reuses the Rescue Center/database fields already introduced by v144.109 and the mail/locale infrastructure from v144.111.

## 2. Deploy

Deploy the complete:

`spreelo-144.112-ANALYSIS-FAILFAST-CUSTOMER-RESCUE-FULL.zip`

to the existing Spreelo Vercel project.

No new Vercel environment variables are required.

## 3. Smoke test — confirmed security block

Use a test brand whose website is known to return a security block to Spreelo.

1. Start a brand analysis from onboarding or Brand Profile.
2. Expected: once Spreelo has positively identified `WEBSITE_SECURITY_BLOCKED`, the automatic analysis stops.
3. Confirm Vercel logs do **not** show a new blocked-site hosted web-research submission.
4. Confirm the analysis job becomes `failed / manual_rescue_pending` with a `analysis_manual_rescue_security` message code.
5. Confirm **Admin → Rescue Center → Misslyckade analyser** receives the brand immediately.
6. Confirm the customer popup explains that website security blocked automatic analysis, that Spreelo will finish the analysis + personal calendar manually, and that an email will arrive when ready.
7. Confirm the customer can continue into Spreelo and does not need to keep the analysis page open.

## 4. Smoke test — timeout

For a controlled timeout test:

1. Cause the website fetch to return `WEBSITE_FETCH_TIMEOUT`.
2. Confirm the first timeout schedules one short retry (`website_timeout_retry`).
3. Confirm no hosted web-research fallback starts.
4. Cause the retry to time out again.
5. Confirm the job moves to manual rescue and the customer sees the timeout-specific rescue explanation.

## 5. Smoke test — Brand Profile persistence

1. Trigger a manual-rescue analysis state.
2. Close the popup.
3. Confirm Brand Profile shows the persistent manual-analysis-pending card rather than the old generic failure card.
4. Refresh the browser.
5. Confirm the pending state remains visible and no ordinary Analyze/Retry CTA is shown while rescue is pending.

## 6. Complete one real rescue

1. Export the analysis rescue brief from Admin Rescue Center.
2. Complete it with the existing ChatGPT rescue flow.
3. Import and preview the returned package.
4. Approve it.
5. Confirm `analysis_rescue_required` becomes false.
6. Confirm the ordinary Brand Profile and personal campaign calendar are populated.
7. Confirm the customer receives one localized `analysis_completed` email whose copy clearly says the analysis and personal campaign calendar are ready.

## 7. Regression checks

Confirm normal accessible websites still analyze automatically and proceed to the existing ready flow without seeing any rescue UI.

Admin MFA/passkey/TOTP security is deliberately **not part of v144.112**.
