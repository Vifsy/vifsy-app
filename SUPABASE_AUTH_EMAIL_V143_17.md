# Branded and localized Spreelo authentication email

The login flow works without this optional hook. Until it is activated,
Supabase continues to send its current standard email.

## What is included

`supabase/functions/send-auth-email/index.ts` contains a signed Supabase Send
Email Hook that:

- sends the email through the existing Resend account;
- uses the Spreelo visual identity;
- sends both HTML and plain text;
- reads the language selected on the login page;
- contains copy for every app language currently listed by Spreelo;
- keeps the six-digit Supabase OTP and its existing security model.

## Important: the Vercel deployment does not activate this email

Deploying the application zip only updates the web application. Supabase Auth
continues to send its standard email until the separate Send Email Hook below
has been deployed and selected in the Supabase dashboard.

## Activate it after deploying the zip

1. Deploy the function:

   `supabase functions deploy send-auth-email --no-verify-jwt`

2. Add these Edge Function secrets:

   - `RESEND_API_KEY` — the existing Resend API key.
   - `SPREELO_AUTH_EMAIL_FROM` — for example
     `Spreelo <noreply@spreelo.com>`.

3. In Supabase Dashboard, open **Authentication > Hooks > Send Email** and
   choose the deployed `send-auth-email` Edge Function.

4. Copy the hook signing secret shown by Supabase and add it to the Edge
   Function as `SEND_EMAIL_HOOK_SECRET`.

5. Test one login in Swedish and one in English before enabling it for all
   users.

No SQL migration is required. If the hook is not enabled, authentication falls
back to the current Supabase email behavior.
