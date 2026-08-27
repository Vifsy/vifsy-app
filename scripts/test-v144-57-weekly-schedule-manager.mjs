import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(file, "utf8");
const automation = read("app/automation/page.jsx");
const recurringApi = read("app/api/recurring-plan/route.js");
const upcomingApi = read("app/api/upcoming-plan/route.js");
const upcomingPage = read("app/upcoming-plan/page.jsx");
const worker = read("app/api/cron/run-automations/route.js");
const planPage = read("app/plans/[id]/page.jsx");
const home = read("components/HomeReferenceOverview.jsx");
const sql = read("supabase/v144_57_weekly_schedule_overrides.sql");
const labels = read("lib/i18n/defaultLabels.js");
const uiText = read("lib/i18n/useUiText.js");

// New weekly plans start strictly after the selected plan-start day.
assert.match(automation, /function getNextDateForWeekdayAfterStart/);
assert.match(automation, /excludeStartDate = true/);
assert.match(automation, /startDate:\s*addDaysToDateString\(startDate, 1\)/);
assert.match(automation, /startDate:\s*scheduleType === "weekly" \? addDaysToDateString\(planStartDate, 1\) : planStartDate/);
assert.match(automation, /normalizedStartDate[\s\S]*getNextDateForWeekdayAfterStart\([\s\S]*excludeStartDate: true/);

// Weekday rhythm is a real weekly template, with a clear double-post state and
// exact slot selection when two posts share a day.
assert.match(automation, /const weeklyDayCounts = useMemo/);
assert.match(automation, /targetCount >= 2/);
assert.match(automation, /weekdayMoveSourceSlotId/);
assert.match(automation, /automation\.weekRhythm\.chooseSpecificDouble/);
assert.match(automation, /automation\.weekRhythm\.moveThisPost/);
assert.match(automation, /plan-v14457-week-day/);
assert.match(automation, /const \[varyWeeklyContentTypes, setVaryWeeklyContentTypes\] = useState\(true\)/);
assert.match(automation, /selectionMode: "history_balanced"/);
assert.match(worker, /selectHistoryBalancedAdaptiveVariant/);

// Customer-facing automatic plans expose dayparts, not minute-level scheduling.
assert.match(automation, /getCampaignTimeWindowDisplay\(slot\.publishTime, locale\)/);
assert.match(automation, /automation\.weekRhythm\.exactTimeAutomatic/);
assert.ok(!automation.includes('pickerId={`campaign-slot-time-${slot.id}`}'), "Campaign schedule must no longer expose an exact-time picker");
assert.match(automation, /distributePublishTimeInsideDaypart/);

// Normal editable dates cannot go backwards.
assert.match(automation, /minDate=\{getDateInputValueInTimeZone\(new Date\(\), timeZone\)\}/);
assert.match(automation, /const pastDateSlot = slotsToSave\.find/);
assert.match(automation, /automation\.errorPastDate/);

// Late calendar campaigns retain past rows in the preview, but those rows are
// locked, cost zero and are excluded from activation/reservation.
assert.match(automation, /const skippedPastCampaignSlots = useMemo/);
assert.match(automation, /const executableSlots = useMemo/);
assert.match(automation, /const slotsToSave = slots\.filter/);
assert.match(automation, /isSlotScheduledInPast\(slot, timeZone\)/);
assert.match(automation, /skipped-credit">0 \{t\("automation\.credits"\)\}/);
assert.match(automation, /disabled=\{saving \|\| !hasEnoughCredits \|\| !executableSlots\.length\}/);
assert.match(labels, /"automation\.campaignExperience\.skippedPast"/);
assert.match(labels, /"automation\.campaignExperience\.skippedPastSummary"/);

// Future one-week changes live separately from the recurring rule template.
assert.match(sql, /create table if not exists public\.automation_schedule_overrides/);
assert.match(sql, /unique \(automation_rule_id, base_run_date\)/);
assert.match(sql, /create or replace function public\.adjust_schedule_override_reservation/);
assert.match(sql, /references public\.automation_rules\(id\)[\s\S]*on delete cascade/);
assert.ok(!sql.includes('create policy "Users can create their own schedule overrides"'), "Schedule override writes must be server-mediated");
assert.match(recurringApi, /automation_schedule_overrides/);
assert.match(recurringApi, /startOfWeekDate\(baseRunDate, plan\.timezone\) !== startOfWeekDate\(overrideRunDate, plan\.timezone\)/);
assert.match(recurringApi, /overrideRunDate <= today/);
assert.match(recurringApi, /targetDateCount >= 2/);
assert.match(recurringApi, /automation_occurrences/);
assert.match(recurringApi, /currentEffectiveRunDate/);
assert.match(recurringApi, /occurrenceRangeStartDate/);
assert.match(recurringApi, /adjust_schedule_override_reservation/);
assert.match(recurringApi, /restorePreviousOverride/);
assert.match(recurringApi, /override_content_type_id/);
assert.match(recurringApi, /distributeInsideDaypart/);

// The worker applies a one-week override transiently, then advances from the
// original base occurrence so the permanent weekday template does not drift.
assert.match(worker, /applyActiveScheduleOverrides/);
assert.match(worker, /_base_scheduled_publish_at/);
assert.match(worker, /_base_publish_time/);
assert.match(worker, /applyScheduleOverrideContent/);
assert.match(worker, /SMART_QUEUE_HORIZON_HOURS \+ 7 \* 24/);
assert.match(worker, /optimizeNextWeeklyPublishTime/);
assert.match(worker, /loadScheduleOverrideForBaseRun/);

// Manager can browse weeks and only shows a slot from its actual first run date.
assert.match(planPage, /setWeekOffset/);
assert.match(planPage, /weekOffset >= 26/);
assert.match(planPage, /baseDate >= firstRunDate/);
assert.match(planPage, /const locked = displayDate <= plan\.today \|\| Boolean\(occurrence\)/);
assert.match(planPage, /otherCount >= 2/);
assert.match(planPage, /overrideContentTypeId: item\.manualContentTypeId/);
assert.match(planPage, /planManager\.autoContentType/);
assert.match(labels, /"planManager\.upcoming": "Spreelo’s current recommendation · may adapt before generation"/);
assert.match(home, /href=\{`\/plans\/\$\{plan\.rules\[0\]\.id\}`\}/);

// The existing email-link upcoming-plan editor now follows the same rules:
// dates only, future/same-week checks, and Spreelo selects/distributes time.
assert.ok(!upcomingPage.includes('type="time"'), "Upcoming-plan page must not expose exact time input");
assert.match(upcomingPage, /getDaypartLabel/);
assert.match(upcomingPage, /min=\{plan\.today/);
assert.match(upcomingApi, /nextDateValue <= todayValue/);
assert.match(upcomingApi, /startOfLocalWeek\(nextDateValue\) !== startOfLocalWeek\(baseParts\.date\)/);
assert.match(upcomingApi, /override_publish_time: update\.overridePublishTime/);
assert.match(upcomingApi, /distributeInsideDaypart/);
assert.match(upcomingApi, /currentEffectiveDate/);
assert.match(upcomingApi, /occurrenceRangeStartDate/);


// QA hardening: the alternate/legacy planner view must obey the same weekly
// and late-campaign locks, and manual weekday choices must survive rescheduling.
assert.match(automation, /slot\.dateLocked \|\| slot\.weekdayLocked/);
assert.match(automation, /scheduleType === "weekly" && planCreationMode !== "campaign"[\s\S]*automation\.weekRhythm\.changeDayAbove/);
assert.match(automation, /isPastCampaignSlot[\s\S]*automation\.campaignExperience\.skippedPast/);
assert.match(automation, /isPastCampaignSlot \? `0 \${t\("automation\.credits"\)}`/);
assert.match(automation, /automation\.errorPastDateTime/);
assert.match(labels, /"automation\.errorPastDate"/);
assert.match(labels, /"automation\.errorPastDateTime"/);
assert.match(worker, /relevantBaseDates[\s\S]*minBaseDate[\s\S]*maxBaseDate/);

// New UI copy must invalidate the persistent translation cache once.
assert.match(uiText, /TRANSLATION_CACHE_VERSION = "v24"/);

console.log("v144.57 weekly schedule manager checks passed");
