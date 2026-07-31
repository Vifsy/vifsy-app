# Deploy v143.19

This release makes brand analysis server-owned and durable. Closing the browser no longer stops an analysis. A protected website is researched through public pages on its official domain, and unusually long jobs are reclaimed and continued by the queue.

## Required deployment order

1. Run `supabase/v143_19_durable_brand_analysis.sql` once in the Supabase SQL editor.
2. Confirm these existing Vercel environment variables are available in Production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `RESEND_API_KEY`
   - `CRON_SECRET`
3. Deploy the application.

Optional: set `BRAND_ANALYSIS_WEB_RESEARCH_MODEL`. If it is not set, Spreelo uses `PRODUCT_RESEARCH_MODEL` and then `gpt-5.5` as the protected-site fallback.

## What to verify after deployment

- `/api/cron/run-brand-analysis-jobs` appears once per minute in Vercel logs.
- A normal analysis can be started and the browser can be closed without cancelling it.
- A protected site shows the background web-research notice instead of failing.
- A completed analysis sends one localized completion email with a secure sign-in link.
- The first verified sign-in sends one localized welcome email.

The browser may wait up to one cron interval before a newly queued analysis is claimed. That delay does not mean the job has stopped.
