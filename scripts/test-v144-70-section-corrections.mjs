import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(f)=>fs.readFileSync(path.join(root,f),"utf8");
const page=read("app/automation/page.jsx");
const css=read("app/styles/70-v144-70-section-corrections.css");
const globals=read("app/globals.css");
const checks=[
  [globals.trimEnd().endsWith('@import "./styles/70-v144-70-section-corrections.css";'),"final stylesheet"],
  [css.includes(".plan-v14341-date-tile .custom-picker-button > strong")&&css.includes("display: none !important"),"settings calendar icon removed"],
  [css.includes("font-size: 12px !important")&&css.includes("text-align: left !important"),"settings help and date are readable"],
  [css.includes("border-left: 4px solid #9b75ff")&&css.includes("inset: 0 auto 0 0"),"weekly edge is the outer edge"],
  [page.includes("plan-v14470-planned-meta")&&!page.includes('<LayoutGrid size={16} aria-hidden="true" />\n                            <strong>{slotPlatformOptions.length}'),"metadata wrapper and icon removal"],
  [css.includes("grid-template-columns: repeat(3, minmax(0, 1fr))")&&css.includes("height: 34px !important"),"equal metadata distribution"],
  [page.includes('plan-v83-continuation-card${scheduleType === "weekly" ? "" : " is-inactive"}')&&page.includes('scheduleType === "weekly" ? <div className="plan-v83-variation-row">'),"ongoing plan stays reversible"],
  [!page.includes('className="plan-v70-filter-row"')&&!page.includes('className="plan-v70-more-formats"')&&page.includes("plan-v14470-format-browser"),"format filters replaced"],
  [css.includes("@media (min-width: 761px) and (max-width: 1180px)")&&css.includes("border-radius: 50% !important"),"tablet channel icons compact"],
];
for(const [ok,msg] of checks){if(!ok)throw new Error(`v144.70 failed: ${msg}`)}
console.log(`v144.70 section corrections passed (${checks.length} checks).`);
