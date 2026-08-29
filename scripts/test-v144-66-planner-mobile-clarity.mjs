import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "app/styles/66-v144-66-planner-mobile-clarity.css"), "utf8");
const globals = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

const checks = [
  globals.trimEnd().endsWith('@import "./styles/66-v144-66-planner-mobile-clarity.css";'),
  css.includes("height:auto !important") && css.includes("min-height:40px !important"),
  css.includes(".plan-v14457-week-days") && css.includes("repeat(7,minmax(0,1fr))"),
  css.includes(".plan-v14457-week-day > b") && css.includes("display:none !important"),
  css.includes("min-height:142px !important"),
  css.includes('"visual purpose channel"'),
  css.includes(".plan-v143-planned-purpose") && css.includes("background:transparent !important"),
  css.includes("top:10px !important") && css.includes("right:10px !important"),
];

checks.forEach((passed, index) => {
  if (!passed) throw new Error(`v144.66 planner clarity check ${index + 1} failed`);
});

console.log(`v144.66 planner mobile clarity checks passed (${checks.length} checks).`);
