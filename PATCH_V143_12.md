# v143.12 — brand-analysis session refresh

v143.12 includes all v143.11 changes and fixes long-running brand analysis
losing access to `/api/analyze-brand/status` when the original Supabase access
token expires.

## Fixed

- `/brand` and `/onboarding` no longer reuse one captured access token for the
  entire analysis.
- Every status poll reads the current browser session.
- A token with less than 15 seconds remaining is refreshed before the request.
- If a status request still returns `401`, the session is refreshed and that
  request is retried exactly once with the replacement token.
- The analysis job remains the source of truth and is not restarted, so the fix
  does not create another OpenAI analysis or charge.

## Deployment

- No SQL migration.
- No new environment variable.
- Includes the authoritative GPT-5.5 campaign web-agent flow from v143.11.

## Verification

- `node scripts/test-v143-12-brand-analysis-session-refresh.mjs`
- `node scripts/test-v143-11-authoritative-gpt55-web-agent.mjs`
- `node scripts/test-v143-8-school-search-quality.mjs`
- full Next.js production build
