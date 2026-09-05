# Deploy Spreelo v144.113

## SQL

**No SQL migration is required.**

## Deploy

Deploy the full ZIP:

`spreelo-144.113-ANALYSIS-RESCUE-NEXT-ATTEMPT-FIX-FULL.zip`

No new Vercel environment variables are required.

## Smoke test

1. Start an analysis against a site known to return a confirmed website-security 403, such as the site that exposed the v144.112 issue.
2. Expected: the 403 is detected immediately.
3. Expected: no paid hosted web-research fallback starts.
4. Expected: the brand-analysis job becomes `failed / manual_rescue_pending` without a database constraint error.
5. Expected: Admin → Rescue Center → Failed analyses receives the case.
6. Expected: the customer is released from the waiting UI and gets the manual-completion handoff state.

## Regression commands

- `npm run test:v144.112`
- `npm run test:v144.113`
