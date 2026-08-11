import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const automation = read("app/automation/page.jsx");
const billing = read("components/StripeBillingPanel.jsx");
const labels = read("lib/i18n/defaultLabels.js");
const formats = read("lib/contentFormatLibrary.js");
const economics = read("lib/contentEconomics.js");
const compatibility = read("lib/platformContentCompatibility.js");
const worker = read("app/api/cron/run-automations/route.js");
const css = read("app/styles/43-v143-83-giveaway-billing.css");

assert(formats.includes('content_type_id: "giveaway"'), "Giveaway content format is missing");
assert(formats.includes('icon_name: "Gift"'), "Giveaway icon is missing");
assert(economics.includes('giveaway: 10'), "Giveaway default credit cost is missing");
assert(compatibility.includes('giveaway: "single_image"'), "Giveaway platform media compatibility is missing");

assert(automation.includes('selectedFormatPreview.kind === "giveaway"'), "Giveaway special content-flow handling is missing");
assert(automation.includes('id="plan-v14383-giveaway-builder"'), "Giveaway configuration builder is missing");
assert(automation.includes('setScheduleType("once")'), "Giveaway must be created as a one-off post");
assert(automation.includes('setSelectedContentTypeIds(["giveaway"])'), "Giveaway is not isolated as its own one-off plan");
assert(automation.includes('selectedPlatformKeys.length === 1 && selectedPlatformKeys[0] === "instagram"'), "Instagram-only tag/story safeguard is missing");
assert(automation.includes('Tag ${effectiveTagCount} friend'), "Tag-friend participation option is missing");
assert(automation.includes('Share the giveaway post to an Instagram Story.'), "Instagram Story share option is missing");
assert(automation.includes('giveawayWinnerNotification'), "Winner notification control is missing");
assert(automation.includes('giveawayTerms'), "Optional giveaway terms are missing");
assert(automation.includes('Giveaway prize: ${prize}'), "AI image prompt is not grounded in the giveaway prize");
assert(css.includes('.plan-v14383-giveaway-builder'), "Giveaway responsive styling is missing");
assert(css.includes('@media (max-width: 720px)'), "Giveaway mobile adaptation is missing");

assert(worker.includes('const isGiveawayRule = String(rule?.content_type_id || "").trim() === "giveaway"'), "Worker giveaway special handling is missing");
assert(worker.includes('const destinationUrl = isGiveawayRule ? "" : getPostDestinationUrl(rule);'), "Giveaway should not force a website CTA URL");
assert(worker.includes('Prioritize complete, unambiguous participation instructions'), "Worker giveaway completeness rule is missing");

assert(billing.includes('const viewingDifferentInterval = Boolean'), "Billing interval-aware button state is missing");
assert(billing.includes('billing.switchToYearlyPlan'), "Yearly plan switch label is missing");
assert(billing.includes('billing.switchToMonthlyPlan'), "Monthly plan switch label is missing");
assert(billing.includes('isScheduledAtPeriodEnd'), "Scheduled downgrade/interval change note handling is missing");
assert(billing.indexOf('else if (viewingDifferentInterval)') < billing.indexOf('else if (isUpgrade)'), "Interval switch wording must take precedence over upgrade wording");
assert(labels.includes('"billing.switchToYearlyPlan": "Switch to {plan} yearly"'), "Billing yearly switch translation missing");
assert(labels.includes('"automation.giveaway.title": "Create a giveaway"'), "Giveaway translations missing");

console.log("v143.83 giveaway + billing interval regression checks passed");
