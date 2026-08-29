import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "app/styles/65-v144-65-settings-vertical-alignment.css"), "utf8");
const globals = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");

const checks = [
  globals.includes('@import "./styles/65-v144-65-settings-vertical-alignment.css";'),
  css.includes(".plan-v90-setting-tile:not(.plan-v14459-platform-tile)"),
  css.includes("align-items:center !important"),
  css.includes("align-self:center !important"),
  css.includes("height:78px !important"),
  css.includes(".plan-v14341-date-tile .custom-picker-field"),
  css.includes("transform:none !important"),
];

checks.forEach((passed, index) => {
  if (!passed) throw new Error(`v144.65 vertical-alignment check ${index + 1} failed`);
});

console.log(`v144.65 settings vertical-alignment checks passed (${checks.length} checks).`);
