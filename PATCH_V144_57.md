# Spreelo v144.57 — weekly schedule manager + late campaign activation

## Why this patch exists

The Content Studio previously represented a plan such as **3 posts per week** as three independent recurring rules with editable calendar dates. That made it possible to move the first dates weeks apart and accidentally turn “3 per week” into an inconsistent schedule.

v144.57 makes the weekly rhythm the authoritative structure. Customers choose/move weekdays, while Spreelo chooses and spreads the exact publishing time. It also adds future week-by-week overrides without mutating the permanent weekly template, prevents planning into the past, and lets calendar campaigns start after some campaign posts have already passed without charging for those skipped posts.

v144.56 public product-copy cleanup and video-music variety remain intact.

## 1. Weekly plans are weekday slots, not arbitrary start dates

`app/automation/page.jsx`

For weekly Content Studio plans:

- the selected frequency remains authoritative, e.g. 3 or 5 posts every week;
- Spreelo proposes the strongest weekdays for the current goal/content mix;
- a compact Monday–Sunday rhythm is shown above the planned posts;
- selected weekdays are marked;
- a day with two posts has a distinct double/count state;
- a marked single-post day can be clicked and then moved to another weekday;
- when two posts share a day, the customer first selects the specific row and then moves that slot;
- a weekday can contain at most two posts.

Changing a recurring weekday also recalculates the first actual occurrence shown for that slot.

## 2. Weekly activation starts strictly after the activation/start day

A new weekly plan never creates its first occurrence on the selected plan-start date itself.

Example:

- recurring weekdays: Monday, Tuesday, Wednesday;
- plan starts/activates on Tuesday;
- Tuesday is not backfilled and is not scheduled again that day;
- the first occurrence is Wednesday;
- the next cycle continues Monday, Tuesday, Wednesday as normal.

This avoids same-day generation/publishing conflicts while still allowing a plan to start in the middle of a week.

## 3. No planning into the past

Customer-editable date controls now enforce the current local date as their minimum date, and save validation also rejects past dates server-side/in the save path rather than relying only on the calendar control.

This applies to normal planned posts and relevant campaign/offer date controls.

For activated recurring schedules, occurrences on today or earlier — and any occurrence that has already started generating — are treated as locked in the week manager.

## 4. Spreelo owns the exact publishing minute for automatic plans

Automatic Content Studio schedules no longer expose minute-by-minute time selection.

The customer sees a suitable part of day:

- Morning;
- Late morning;
- Afternoon;
- Evening.

Spreelo then deterministically distributes the exact publishing minute inside a multi-hour window. The selected window depends on the weekday and content type, while the deterministic spread prevents many customers with similar plans from converging on one exact clock time.

Approximate internal ranges:

- Morning: 08:00–10:20;
- Late morning: 10:30–12:50;
- Afternoon: 13:00–17:20;
- Evening: 17:30–20:50.

The existing generation queue still prepares content ahead of publication and retains its lead-time/jitter behavior. Time-window spreading and advance generation therefore work together rather than replacing one another.

## 5. Existing history-balanced weekly content variation remains active

The existing adaptive weekly strategy remains enabled by default.

Spreelo still uses the history-balanced selector to vary content types from week to week based on the available plan variants and recent content history. Moving a future post to another weekday does **not** automatically freeze that slot to the currently previewed recommendation.

In the future-week manager, the customer can either:

- leave the content type on **Let Spreelo choose automatically**; or
- deliberately choose a content type for that one occurrence.

Only an explicit customer choice becomes a content-type override.

## 6. Home recurring schedules open a dedicated week manager

New route/UI:

- `app/plans/[id]/page.jsx`
- `app/api/recurring-plan/route.js`

A recurring schedule on Home now has an **Open plan** action.

The plan manager shows only the selected recurring plan and allows the customer to:

- browse backward and forward week by week;
- see the planned posts for each weekday;
- see Spreelo’s current adaptive content recommendation;
- move a future occurrence to another day in the same week;
- choose a different content type for one future occurrence;
- return a manual content override to automatic selection;
- open an already-created post when a post id exists.

The manager deliberately does not show phantom slots before a rule’s real first `run_date`. Therefore the activation week for a Tue-start Mon/Tue/Wed plan shows Wednesday only.

Past/today/already-started occurrences are grey/locked and cannot be moved.

## 7. One-week overrides do not mutate the permanent recurring template

New database table:

`public.automation_schedule_overrides`

A future edit is stored against:

- `automation_rule_id`;
- `base_run_date`.

It may override for that one occurrence:

- run date;
- automatically distributed publish time;
- content type/label/format;
- credit cost when the customer explicitly selects a different content type.

The worker applies the override transiently. After the occurrence succeeds, the recurring rule advances from its original base occurrence, so moving one Thursday to Friday does not permanently turn all future Thursdays into Fridays.

The worker queue horizon was widened enough to discover a base occurrence that has been moved earlier inside its week.

## 8. Credit reservation follows an immediate content override

New service-role RPC:

`adjust_schedule_override_reservation(rule_id, target_cost)`

When the customer changes the content type of the **next** reserved occurrence:

- a more expensive type reserves the additional credits immediately;
- a cheaper type returns the difference;
- insufficient credits reject the change;
- a failed reservation restores the prior schedule override instead of destroying a valid previous edit.

Future occurrences beyond the currently reserved one do not pre-charge credits merely because the customer previews/edits them. Their cost is applied when they become the next scheduled occurrence under the existing recurring reservation flow.

## 9. Late calendar campaigns can still be activated

`app/automation/page.jsx`

A calendar campaign no longer has to be artificially shifted forward just because its original campaign began earlier.

When opening/activating a campaign late:

- original campaign dates are preserved in the preview;
- posts whose scheduled date/time has already passed remain visible but grey/locked;
- those posts are labelled **Passed · will not run**;
- they show 0 credits;
- they are excluded from `slotsToSave` and from the activation credit requirement;
- only future campaign posts are created/reserved;
- if every campaign post has already passed, activation is disabled/rejected because there is nothing left to run.

This means the customer pays only for campaign posts that Spreelo can still create and deliver.

## 10. Upcoming-plan email editor follows the same model

`app/upcoming-plan/page.jsx`
`app/api/upcoming-plan/route.js`

The upcoming-plan editor no longer exposes an exact time input for automatic schedules. It shows the daypart while Spreelo chooses the actual minute.

Date changes:

- cannot move a post to today/past once it is in this editable future-plan flow;
- must remain within the same week so weekly frequency remains stable;
- cannot create more than two posts on one day;
- do not overwrite unchanged locked rows when another future row is edited.

## 11. Translation/UI cache

New labels were added for the weekly rhythm, skipped campaign posts and recurring-plan manager. The translation cache version is bumped to `v23` so existing installations request the new labels once and then persist them normally.

## Database / deployment

**SQL migration required before deploying the code:**

`supabase/v144_57_weekly_schedule_overrides.sql`

No new Vercel environment variables are required.

## Verification performed

Passed:

- Node syntax checks for the modified cron/recurring-plan/upcoming-plan API routes;
- JSX/JS parser checks for Content Studio, Home, recurring plan manager, upcoming-plan editor and i18n files;
- new `test:v144.57` weekly schedule-manager regression test;
- v144.56 public product-copy + music-variety regression;
- v144.54 Kling scene continuity/provider priority;
- v144.52 market/content-language separation;
- v144.49 Admin-managed music library;
- v144.48 video music library;
- v144.44 deliberate Kling ending;
- v144.42 complete headline/strict Kling product identity;
- v144.21 dashboard/timezone/calendar polish;
- v143.83 giveaway/billing interval;
- v144.00 delivery-first resilience;
- v144.05 approval orchestration/durable research;
- v144.12 exact generation-cost tracking.

The old v143.46 exact-time campaign-unlock test is intentionally superseded because v144.57 removes customer-selected exact times from automatic schedules.

A full local Next.js build was not run because the supplied project ZIP does not contain installed `node_modules`; Vercel remains the authoritative full production build check.
