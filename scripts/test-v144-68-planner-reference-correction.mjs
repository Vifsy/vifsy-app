import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/styles/68-v144-68-planner-reference-correction.css");
const globals = read("app/globals.css");

const checks = [
  [globals.trimEnd().endsWith('@import "./styles/68-v144-68-planner-reference-correction.css";'), "correction is the final CSS layer"],
  [css.includes("html body .automation-page.plan-v70-active"), "legacy specificity is explicitly beaten"],
  [css.includes("min-height: 248px !important") && css.includes("min-height: 166px !important"), "planned cards are compact on desktop and mobile"],
  [css.includes("grid-template-columns: 126px minmax(0, 1fr) !important"), "desktop planned-card content uses the available width"],
  [css.includes("white-space: nowrap !important") && css.includes("max-width: none !important"), "date and content no longer collapse into a narrow text column"],
  [css.includes("tone-2") && css.includes("#43bfc6") && css.includes("tone-3") && css.includes("#ffad67") && css.includes("tone-4") && css.includes("#e385d6"), "four colored visual themes are restored"],
  [css.includes("inset: 18px 20px auto auto !important"), "ellipsis stays at the desktop top-right"],
  [css.includes("height: 72px !important") && css.includes("height: 66px !important"), "settings rows are compact and consistent"],
  [css.includes("align-self: center !important") && css.includes("justify-content: center !important"), "settings copy remains vertically centered"],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(`v144.68 check failed: ${message}`);
}

console.log(`v144.68 planner reference correction checks passed (${checks.length} checks).`);
