import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");
const home = read("components/HomeReferenceOverview.jsx");
const page = read("app/page.jsx");
const settings = read("app/settings/page.jsx");
const settingsPanels = read("components/SettingsPanels.jsx");
const automation = read("app/automation/page.jsx");
const globals = read("app/globals.css");
const css = read("app/styles/55-v144-21-dashboard-timezone-calendar-polish.css");

assert.match(page, /const scheduledRuleItems = useMemo/);
assert.match(page, /scheduledCount=\{homeScheduledItems\.length\}/);
assert.match(page, /scheduledItems=\{homeScheduledItems\}/);
assert.match(page, /campaignSchedules=\{calendarCampaignPlans\}/);
assert.match(home, /showScheduledItems/);
assert.match(home, /Planerade engångsinlägg/);
assert.match(home, /onSetRecurringScheduleState\?\.\(rulePlan, "ended"\)/);
assert.match(home, /showCampaignSchedules/);
assert.match(home, /Aktiva kalenderkampanjer/);
assert.match(home, /Hantera kampanjer/);

assert.match(settings, /Intl\.supportedValuesOf\("timeZone"\)/);
assert.match(settings, /setPublishingTimeZoneDraft\(\(currentDraft\)/);
assert.doesNotMatch(settingsPanels, /onChange=\{\(event\) => setPublishingTimeZoneDraft\(event\.target\.value\)\} disabled=\{savingTimeZone\}/);
assert.match(settingsPanels, /aria-busy=\{savingTimeZone\}/);

assert.match(automation, /ChevronLeft/);
assert.match(automation, /<CalendarDays size=\{16\}/);
assert.match(globals, /55-v144-21-dashboard-timezone-calendar-polish\.css/);
assert.match(css, /custom-calendar-popover/);
assert.match(css, /plan-v70-row-editor:has\(\.custom-calendar-popover\)/);
assert.match(css, /plan-v83-continuation-head h2/);
assert.match(css, /font-size: 17px !important/);
assert.match(css, /plan-v74-approval-publishing-note/);

console.log("v144.21 dashboard/timezone/calendar polish checks passed");
