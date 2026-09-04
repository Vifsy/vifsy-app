# Deploy Spreelo v144.109

## 1. Run the SQL migration first

Open the production Supabase project → **SQL Editor** and run the complete file:

`supabase/v144_109_rescue_center_annual_calendar_email.sql`

Do this **before** deploying the v144.109 application code.

## 2. Deploy the full v144.109 ZIP to Vercel

Deploy the complete project in the same way as the previous Spreelo full ZIP.

No new Vercel environment variables are required.

Existing configuration used by the new flow includes:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (optional existing override)

## 3. Smoke-test after deployment

### Rescue Center

1. Open **Admin → Rescue Center**.
2. Confirm the three areas are visible:
   - Misslyckade analyser
   - Misslyckade inlägg
   - Årlig kalenderförnyelse
3. Open/create one analysis rescue case.
4. Export the rescue brief.
5. Import a valid rescue package.
6. Confirm preview appears before approval.
7. Approve it and confirm the ordinary brand profile/campaign data is updated.

### Existing product rescue

Use the already tested protected-store product rescue path and confirm v144.108 behavior is unchanged:

- rescue JSON → ChatGPT ZIP,
- direct verified `image_url` accepted,
- image copied to Spreelo Storage,
- preview opens,
- admin approval remains possible.

### Annual calendar renewal

1. In Rescue Center, set a test brand to manual calendar rescue.
2. Confirm the annual-renewal list identifies it as needing rescue for the target year.
3. Export/import/approve one annual calendar rescue.
4. Confirm the brand's calendar year is updated and the renewal becomes completed.

For an automatic test brand, confirm an annual refresh can use the normal durable brand-analysis queue with `analysis_kind = annual_calendar_refresh`.

### Customer calendar email

After completing a test annual calendar:

1. Confirm one `calendar_updated` lifecycle email is sent.
2. Confirm the same brand/year does not send a second successful duplicate.
3. Confirm Admin shows the customer notification state.

### Static email translations / cost guard

Activate a normal content plan in a non-English UI language and confirm the standard email sends without a send-time OpenAI translation request.

## Rollback

If application code must be rolled back, the new columns/tables can safely remain in Supabase while older code is running because older versions do not depend on them. Do not drop the new tables while v144.109 is active.
