import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`v144.74 failed: ${message}`); };

const billing = read("components/StripeBillingPanel.jsx");
const changeRoute = read("app/api/stripe/subscription/change/route.js");
const automation = read("app/automation/page.jsx");
const css = read("app/styles/74-v144-74-billing-admin-dates.css");
const globals = read("app/globals.css");

assert(billing.includes('setInterval("month")') && billing.includes('setInterval("year")'), "both billing intervals must be selectable");
assert(billing.includes('const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup'), "visible cards must use the selected cadence");
assert(billing.includes('activePlan && currentInterval === interval'), "only the actual plan and cadence may be disabled as current");
assert(billing.includes('billing.switchMonthly') && billing.includes('billing.switchYearly'), "cadence switch actions are missing");
assert(changeRoute.includes('proration_behavior: "always_invoice"'), "upgrades must invoice Stripe prorations immediately");
assert(changeRoute.includes('levelDelta < 0 || (levelDelta === 0 && current.interval === "year" && targetLookup.plan.interval === "month")'), "downgrades and yearly-to-monthly changes must be scheduled");
assert(changeRoute.includes('"phases[1][items][0][price]": targetPrice.id'), "scheduled downgrade must contain the target Stripe price");

assert(automation.includes('const SPREELO_INTERNAL_TESTER_EMAIL = "johan@foldern.com"'), "internal admin identity changed unexpectedly");
assert(automation.includes('const minimumSelectablePlanningDate = canManuallyEditCampaignPlan\n    ? null'), "admin must have no past-date minimum");
assert((automation.match(/minDate=\{minimumSelectablePlanningDate\}/g) || []).length >= 7, "all relevant planning calendars must use the admin-aware minimum");
assert((automation.match(/!canManuallyEditCampaignPlan && isSlotScheduledInPast/g) || []).length >= 3, "past campaign rows must remain editable only for the admin account");

assert(css.includes('.stripe-reference-interval') && css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'), "reference plan-card layout is missing");
assert(css.includes('.stripe-reference-plan.current > header') && css.includes('#ff5b38'), "current Pro-style treatment is missing");
assert(globals.includes('@import "./styles/74-v144-74-billing-admin-dates.css";'), "v144.74 stylesheet must remain loaded before later refinements");

console.log("v144.74 billing, proration, admin dates and plan-card checks passed.");
