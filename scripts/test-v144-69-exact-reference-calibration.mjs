import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),"utf8");
const css=read("app/styles/69-v144-69-exact-reference-calibration.css");
const globals=read("app/globals.css");
const checks=[
  [globals.trimEnd().endsWith('@import "./styles/69-v144-69-exact-reference-calibration.css";'),"calibration is final"],
  [css.includes("height: 176px !important")&&css.includes("grid-template-rows: repeat(2, 65px)"),"desktop settings align evenly"],
  [css.includes("grid-template-columns: repeat(7, minmax(76px, 108px))")&&css.includes("justify-content: center"),"desktop weekdays are bounded"],
  [css.includes(".plan-v14457-week-day::after")&&css.includes("width: 27px"),"weekday divider matches reference"],
  [css.includes("width: 100% !important")&&css.includes("min-height: 58px !important"),"weekly info band spans content"],
  [css.includes("grid-template-columns: 114px minmax(0, 1fr)")&&css.includes("min-height: 316px"),"planned card follows reference proportions"],
  [css.includes("font-size: 22px !important")&&css.includes("font-size: 14px !important"),"planned-card type hierarchy is calibrated"],
  [css.includes("height: 180px !important")&&css.includes("min-height: 224px !important"),"mobile remains readable"],
  [css.includes("text-overflow: clip !important")&&css.includes("overflow: visible !important"),"mobile day counts never ellipsize"],
];
for(const [ok,msg] of checks){if(!ok)throw new Error(`v144.69 check failed: ${msg}`)}
console.log(`v144.69 exact reference calibration checks passed (${checks.length} checks).`);
