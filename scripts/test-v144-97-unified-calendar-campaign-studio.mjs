import fs from "node:fs";

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const page = fs.readFileSync(new URL("../app/automation/page.jsx", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../app/styles/93-v144-97-unified-calendar-campaign-studio.css", import.meta.url), "utf8");
const globals = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

expect(
  page.includes('automation-page planner-wizard-page plan-v70-active plan-v14380-polish${campaignOpportunity ? " campaign-v14497-unified" : ""}'),
  "calendar campaigns must run inside the regular AI Content Studio visual shell"
);
expect(page.includes('{(\n            <section className="plan-v70-shell">'), "regular Studio shell must render for calendar campaigns");
expect(page.includes('{false ? (\n              <div className="campaign-v14335-shell">'), "legacy standalone campaign experience must be disabled");
expect(page.includes('disabled={planCreationMode === "campaign"}'), "campaign-owned settings must support locked controls");
expect(page.includes('campaignOpportunity?.title || t("automation.focusedCampaignFromCalendar")'), "strategy card must show the campaign identity rather than a generic auto-plan goal");
expect(page.includes('onClick={planCreationMode === "campaign" ? addSlot : openAllFormats}'), "planned-post add action must preserve campaign slot logic");
expect(page.includes('planCreationMode === "campaign" ? removeCampaignSlot(slot.id) : removeSlot(slot.id)'), "planned-post delete action must preserve campaign slot logic");
expect(page.includes('plan-v70-planned-row plan-v86-planned-row'), "calendar campaign posts must use the regular Studio planned-post row structure");
expect(css.includes('campaign-v14497-unified'), "v144.97 campaign compatibility styles must be scoped");
expect(css.includes('@media (max-width: 760px)'), "unified campaign Studio must have an explicit mobile safeguard");
expect(css.includes('overflow-wrap: anywhere'), "long campaign copy must remain readable at constrained widths");
expect(globals.includes('93-v144-97-unified-calendar-campaign-studio.css'), "v144.97 stylesheet must load last");

console.log("v144.97 unified calendar campaign Studio checks passed");
