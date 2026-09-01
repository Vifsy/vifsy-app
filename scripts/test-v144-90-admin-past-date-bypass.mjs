import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`v144.90 failed: ${message}`);
};

const automation = read("app/automation/page.jsx");

assert(
  automation.includes('const SPREELO_INTERNAL_TESTER_EMAIL = "johan@foldern.com"'),
  "internal tester email must remain exact"
);
assert(
  automation.includes('String(currentUserEmail || "").trim().toLowerCase() === SPREELO_INTERNAL_TESTER_EMAIL'),
  "admin email comparison must normalize whitespace and case"
);
assert(
  automation.includes('const minimumSelectablePlanningDate = canManuallyEditCampaignPlan\n    ? null'),
  "admin calendar must allow dates before today"
);
assert(
  automation.includes('if (!canManuallyEditCampaignPlan && value < today) return slot;'),
  "slot-level past dates must only be blocked for non-admin users"
);
assert(
  automation.includes('const safeValue = canManuallyEditCampaignPlan\n      ? value'),
  "plan start date must preserve a past value for the admin tester"
);
assert(
  automation.includes('planCreationMode === "campaign" &&\n      !canManuallyEditCampaignPlan &&\n      isSlotScheduledInPast(slot, timeZone)'),
  "past campaign slots must only be filtered for non-admin users"
);
assert(
  automation.includes('const pastDateSlot = !canManuallyEditCampaignPlan'),
  "save validation must allow an admin past date"
);
assert(
  automation.includes('const pastDateTimeSlot = !canManuallyEditCampaignPlan && scheduleType === "once"'),
  "save validation must allow an admin past date/time"
);
assert(
  automation.includes('if (pastDateSlot) {\n      setMessage(t("automation.errorPastDate"));'),
  "customer past-date save guard must remain present"
);
assert(
  automation.includes('if (pastDateTimeSlot) {\n      setMessage(t("automation.errorPastDateTime"));'),
  "customer past-date-time save guard must remain present"
);

console.log("v144.90 admin-only past-date bypass checks passed.");
