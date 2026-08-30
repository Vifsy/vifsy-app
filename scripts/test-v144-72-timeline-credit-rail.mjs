import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/automation/page.jsx");
const css = read("app/styles/72-v144-72-timeline-credit-rail.css");
const globals = read("app/globals.css");

const plannedBlock = page.slice(page.indexOf("{chronologicalSlots.map"), page.indexOf("{rowExpanded && !isPastCampaignSlot"));
const checks = [
  [globals.trimEnd().endsWith('@import "./styles/72-v144-72-timeline-credit-rail.css";'), "v144.72 is final stylesheet"],
  [page.includes("plan-v14472-visual-credit"), "credits moved into the colored rail"],
  [!plannedBlock.includes("plan-v14470-planned-meta"), "bottom metadata removed from planned posts"],
  [!plannedBlock.includes("getCustomerSlotMarketingPurpose(slot)"), "purpose pill removed"],
  [css.includes('"head note"') && css.includes('"head days"'), "desktop weekly timeline layout"],
  [css.includes(".plan-v14457-week-days::before") && css.includes("height: 2px !important"), "timeline connector"],
  [css.includes(".plan-v14457-week-day::before") && css.includes("border-radius: 50%"), "timeline nodes"],
  [css.includes("grid-template-rows: auto auto auto") && css.includes("grid-row: 1 / 4"), "planned card ends after channels"],
  [css.includes('"head"\n      "note"\n      "days"'), "readable stacked mobile timeline"],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(`v144.72 failed: ${message}`);
}
console.log(`v144.72 timeline and credit rail passed (${checks.length} checks).`);
