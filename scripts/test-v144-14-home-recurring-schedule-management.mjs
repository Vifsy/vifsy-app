import fs from "node:fs";
import assert from "node:assert/strict";

const home = fs.readFileSync("app/page.jsx", "utf8");
const overview = fs.readFileSync("components/HomeReferenceOverview.jsx", "utf8");
const css = fs.readFileSync("app/styles/54-v144-14-schedule-management.css", "utf8");
const globals = fs.readFileSync("app/globals.css", "utf8");

assert.match(home, /recurringSchedules=\{recurringSchedules\}/);
assert.match(home, /scheduleActionLoading=\{scheduleActionLoading\}/);
assert.match(home, /onSetRecurringScheduleState=\{setOperationalPlanState\}/);

assert.match(overview, /Hantera scheman/);
assert.match(overview, /Pågående veckoscheman/);
assert.match(overview, /onSetRecurringScheduleState\?\.\(plan, isPaused \? "active" : "paused"\)/);
assert.match(overview, /onSetRecurringScheduleState\?\.\(plan, "ended"\)/);
assert.match(overview, /window\.confirm\("Avsluta detta schema\?/);
assert.match(overview, /href="\/automation".*Nytt schema/s);

assert.match(css, /home-reference-recurring-manager/);
assert.match(css, /home-reference-recurring-actions/);
assert.match(globals, /54-v144-14-schedule-management\.css/);

// Guardrail: v144.14 must not touch generation / product / campaign runtime code.
for (const forbidden of [
  "app/api/cron/run-automations/route.js",
  "lib/product",
]) {
  assert.ok(!overview.includes(forbidden));
}

console.log("v144.14 home recurring schedule management static checks passed");
