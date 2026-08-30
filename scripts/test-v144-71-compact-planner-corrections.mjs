import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/automation/page.jsx");
const css = read("app/styles/71-v144-71-compact-planner-corrections.css");
const globals = read("app/globals.css");

const checks = [
  [globals.trimEnd().endsWith('@import "./styles/71-v144-71-compact-planner-corrections.css";'), "v144.71 is the final stylesheet"],
  [page.includes("(slots.length + slotIndex) % variants.length"), "next-cycle credits mirror history-balanced selection"],
  [page.includes("Planen är redan optimerad") && page.includes("Valfritt: lägg till eller byt format"), "content formats are clearly optional"],
  [css.includes(".plan-v70-planned-card { order: 5") && css.includes(".plan-v70-formats-card { order: 6"), "content formats follow planned posts"],
  [css.includes("grid-template-rows: auto auto auto auto") && css.includes("min-height: 0 !important"), "planned cards have no empty height"],
  [css.includes("article.plan-v70-planned-row > button.plan-v70-row-menu") && css.includes("top: 14px !important"), "planned menu is pinned to top-right"],
  [css.includes(".plan-v14467-week-visual") && css.includes("display: none !important"), "inner weekly visual removed"],
  [css.includes("height: 58px !important") && css.includes("height: 52px !important"), "weekday cards are compact"],
  [css.includes("font-weight: 600 !important") && css.includes("background: #fffaf7 !important"), "start date matches choice fields"],
  [css.includes(".plan-v89-guide-collapse") && css.includes("margin-bottom: 22px !important"), "guide can be closed and has spacing"],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(`v144.71 failed: ${message}`);
}

console.log(`v144.71 compact planner corrections passed (${checks.length} checks).`);
