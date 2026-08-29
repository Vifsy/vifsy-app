import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const css = read("app/styles/64-v144-64-settings-review-social.css");
const globals = read("app/globals.css");
const automation = read("app/automation/page.jsx");

const checks = [
  [globals.includes('@import "./styles/64-v144-64-settings-review-social.css";'), "v144.64 stylesheet is imported last"],
  [automation.includes('className="plan-v14464-platform-selector"'), "plan uses the clear platform selector"],
  [automation.includes("plan-v14464-platform-check"), "platform choices have an integrated selected state"],
  [!automation.includes('className={`platform-multiselect plan-v73-platform-multiselect ${platformDropdownOpen ? "open" : ""}`}'), "primary plan platform selection no longer collapses"],
  [css.includes("grid-template-columns:repeat(auto-fit,minmax(132px,1fr))"), "platform choices use a responsive grid"],
  [css.includes("clip:rect(0,0,0,0)"), "native checkbox is visually hidden while remaining accessible"],
  [css.includes("overflow-x:hidden !important"), "review detail cannot create horizontal overflow"],
  [css.includes(".admin-v14401-partial-actions") && css.includes("display:contents !important"), "partial review actions participate in the responsive grid"],
  [css.includes(".social-v74-connect-panel") && css.includes("border-radius:0 !important"), "redundant social connection shell is removed"],
  [css.includes("width:min(920px,100%)"), "destination picker has a professional constrained width"],
  [css.includes("padding-right:16px") && css.includes("padding-left:16px"), "destination picker retains mobile gutters"],
];

for (const [passed, message] of checks) {
  if (!passed) throw new Error(`v144.64 check failed: ${message}`);
}

console.log(`v144.64 settings, review and social checks passed (${checks.length} checks).`);
