# Patch v144.14 — Recurring schedule management restored to Home

## Problem
The reference Home redesign displayed the number of recurring schedules but the only action in the row was `Skapa schema`. The previous dashboard already had operational schedule controls, but the early return to `HomeReferenceOverview` made those controls unreachable.

## Fix
- Pass existing grouped `recurringSchedules` from `app/page.jsx` into `HomeReferenceOverview`.
- Reuse the existing `setOperationalPlanState` function; no duplicate database logic was added.
- When recurring schedules exist, replace the misleading `Skapa schema` action with `Hantera scheman`.
- Add an expandable schedule manager directly beneath the recurring-schedule row.
- Show grouped plan name, state, posts/week, next run and platforms.
- Expose existing Pause / Resume and End behaviors.
- Keep `Nytt schema` as a separate creation action inside the manager.

## Files changed from v144.13
- `app/page.jsx`
- `components/HomeReferenceOverview.jsx`
- `app/globals.css`
- new `app/styles/54-v144-14-schedule-management.css`
- new `scripts/test-v144-14-home-recurring-schedule-management.mjs`
- docs only

No SQL migration.
