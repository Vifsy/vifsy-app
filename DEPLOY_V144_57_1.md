# Deploy Spreelo v144.57.1

Use v144.57.1 instead of the first v144.57 ZIP.

1. Run the corrected `supabase/v144_57_weekly_schedule_overrides.sql` in Supabase SQL Editor.
   - If you already ran the first v144.57 SQL, run this corrected file again. It safely repairs the foreign key/RLS policies and keeps existing valid overrides.
2. Deploy the complete v144.57.1 ZIP to Vercel.
3. Wait for the production deployment to become Ready.
4. Smoke-test:
   - a weekly plan started after one or more selected weekdays have already passed;
   - moving one future weekly post to another day in the same week;
   - changing a future occurrence content type and then restoring automatic selection;
   - a late calendar campaign with at least one already-passed slot (past rows grey/locked and 0 credits);
   - Home -> recurring schedules -> open plan -> browse several future weeks;
   - one video generation to confirm the v144.56 music-variety behavior remains intact.

No new environment variables are required.
