# Spreelo v144.14 — Home schedule management

## Deploy
1. Deploy the full ZIP as usual.
2. No SQL migration is required.
3. No new Vercel environment variables are required.

## What changed
The redesigned Home page now exposes existing recurring schedules instead of only linking to creation.

When at least one recurring schedule exists, **Återkommande scheman** shows **Hantera scheman**. Expanding it shows each grouped weekly plan with:
- active/paused status
- posts per week
- next run
- connected platform(s)
- Pause / Resume
- End schedule
- separate link to create a new schedule

## Safety scope
This patch only changes Home/dashboard presentation and wires it to the schedule-management function that already existed in `app/page.jsx`.

It does **not** change:
- post generation
- Product Engine
- 403 fallback
- product/image verification
- campaign identity lock
- cost tracking
- publishing
- cron worker behavior

`End schedule` uses the existing `end_automation_rules_keep_history` flow already present in the dashboard code.
