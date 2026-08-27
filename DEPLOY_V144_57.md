# Deploy Spreelo v144.57

## Important: run the SQL migration first

Before deploying the application ZIP, run this file in the Supabase SQL Editor for the production project:

`supabase/v144_57_weekly_schedule_overrides.sql`

It creates the one-week recurring schedule override table and the service-role credit-reservation adjustment function used by the new recurring plan manager.

Do not deploy the new application code first and leave the migration unapplied if you intend to use the new manager immediately.

## Then deploy the full ZIP

Deploy the complete v144.57 project to Vercel in the same way as the previous full Spreelo packages.

No new Vercel environment variables are required.

## Recommended production smoke test

1. Create a 3-post weekly plan with Monday, Tuesday and Wednesday while the plan start day is Tuesday.
   - Expected: first occurrence Wednesday; no same-day Tuesday occurrence; next week contains Monday/Tuesday/Wednesday.
2. In Content Studio, move one marked weekday to another empty day.
   - Expected: post row follows the new weekday; frequency remains three posts/week.
3. Create/test a 5-post plan and put two slots on one day.
   - Expected: the day shows the double/count state; a third post on that day is rejected.
4. Confirm automatic schedules show Morning/Late morning/Afternoon/Evening rather than an exact minute picker.
5. Activate the weekly plan, open Home → recurring schedules → Open plan.
   - Expected: the dedicated manager opens only that plan and can browse future weeks.
6. Move one future occurrence inside its week.
   - Expected: only that week changes; following weeks keep the permanent base weekday.
7. Change one future occurrence to another content type, then return it to “Let Spreelo choose automatically”.
   - Expected: manual override can be added/removed without freezing ordinary adaptive variation.
8. Open a calendar campaign after one or more original campaign posts have passed.
   - Expected: passed rows are grey/locked, show 0 credits and are not created; only remaining future posts contribute to required credits.
9. Confirm a past date cannot be selected/saved for a normal planned post.
10. Confirm existing carousel/product-copy cleanup and video music rotation from v144.56 still behave normally.

## Rollback note

If the application code must be rolled back, leaving `automation_schedule_overrides` in the database is harmless to older code because older versions do not query it. Do not drop the table while v144.57 is active.
