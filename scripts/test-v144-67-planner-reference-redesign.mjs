import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/automation/page.jsx");
const css = read("app/styles/67-v144-67-planner-reference-redesign.css");
const globals = read("app/globals.css");

const plannedSection = page.slice(
  page.indexOf('id="plan-v70-planned-posts"'),
  page.indexOf('className={`plan-v107-bottom-grid')
);

const checks = [
  [globals.includes('@import "./styles/67-v144-67-planner-reference-redesign.css";'), "reference stylesheet remains imported"],
  [page.includes("plan-v14467-settings-groups") && page.includes("plan-v14467-settings-group"), "settings are grouped"],
  [page.includes("STRATEGI") && page.includes("SCHEMA") && page.includes("KANALER & SPRÅK"), "settings groups match the reference information architecture"],
  [page.includes("platformDropdownOpen ? (") && page.includes("plan-v14467-platform-options"), "platform choices only render when opened"],
  [page.includes("const chronologicalSlots = useMemo") && page.includes("chronologicalSlots.map"), "planned posts render chronologically"],
  [page.includes("plan-v14467-week-visual") && page.includes("plan-v14467-week-content"), "weekly rhythm has the reference visual rail"],
  [page.includes("plan-v14467-destinations-label") && page.includes("plan-v14467-platform-count"), "planned cards expose destinations and metadata"],
  [!plannedSection.includes("duplicateSlot(slot.id)"), "duplicate action is removed from planned cards"],
  [css.includes("align-items: center !important") && css.includes("align-self: center !important"), "settings content is vertically centered"],
  [css.includes("top: 24px !important") && css.includes("right: 26px !important"), "desktop ellipsis is fixed at the top right"],
  [css.includes("grid-template-columns: repeat(7") && css.includes("@media (max-width: 760px)"), "weekly rhythm is responsive across all seven days"],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(`v144.67 check failed: ${message}`);
}

console.log(`v144.67 planner reference redesign checks passed (${checks.length} checks).`);
