import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("app/automation/page.jsx");
const css = read("app/styles/73-v144-73-pixel-mobile-settings-week.css");
const globals = read("app/globals.css");

const checks = [
  [globals.trimEnd().endsWith('@import "./styles/73-v144-73-pixel-mobile-settings-week.css";'), "v144.73 is the final stylesheet"],
  [page.includes("plan-v14473-goal-tile") && page.includes("plan-v14473-frequency-tile") && page.includes("plan-v14473-language-tile"), "mobile value rows have stable hooks"],
  [page.includes("plan-v14473-date-chevron"), "date row has the reference chevron"],
  [page.includes('<Clock3 size={20} aria-hidden="true" />') && page.includes('<Send size={20} aria-hidden="true" />'), "publishing and platform icons match reference"],
  [page.includes("Spreelo har valt de starkaste veckodagarna för denna plan."), "weekly helper text is concise"],
  [css.includes("display: contents !important") && css.includes("height: 41px !important"), "settings are one six-row mobile card"],
  [css.includes("order: 4 !important") && css.includes("order: 6 !important"), "mobile row order matches reference"],
  [css.includes("min-height: 39px !important") && css.includes("height: 35px !important"), "week timeline is reference-height"],
  [css.includes(".plan-v14457-week-rhythm-note") && css.includes("display: none !important"), "extra weekly note removed"],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(`v144.73 failed: ${message}`);
}
console.log(`v144.73 pixel mobile settings/week passed (${checks.length} checks).`);
