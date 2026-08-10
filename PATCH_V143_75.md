# Spreelo v143.75 — Automation prerender build fix

## Fixed
- `/automation` used React `useCallback` without importing it.
- Added `useCallback` to the React import in `app/automation/page.jsx`.
- Added a regression test that fails if `/automation` uses `useCallback` without importing it.

## Scope
This is a build-only hotfix on top of v143.74. No product logic, credit logic, Stripe logic, database schema, publishing logic, or UI behavior was intentionally changed.

## SQL
No new SQL is required for v143.75. The v143.74 SQL is still required if it has not already been run.
