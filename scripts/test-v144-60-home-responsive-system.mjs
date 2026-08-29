import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const globals = read("app/globals.css");
const css = read("app/styles/60-v144-60-home-responsive-system.css");
const home = read("components/HomeReferenceOverview.jsx");

expect(globals.includes('@import "./styles/60-v144-60-home-responsive-system.css";'), "v144.60 responsive system remains imported");
expect(css.includes("@media (min-width:1451px)"), "wide desktop has an explicit layout mode");
expect(css.includes("@media (min-width:901px) and (max-width:1450px)"), "tablet has an explicit non-overlapping layout mode");
expect(css.includes("@media (max-width:900px)"), "mobile has a dedicated card layout mode");
expect(css.includes(".home-reference-workspace {\n    display:block"), "tablet and mobile stack plans and coach instead of squeezing columns");
expect(css.includes("grid-template-columns:repeat(2,minmax(0,1fr))"), "tablet statistics use a stable two-by-two grid");
expect(css.includes(".home-reference-plans article > svg") && css.includes("border-radius:50%"), "plan types use the shared circular icon language");
expect(css.includes(".home-reference-focus > span strong") && css.includes("border-radius:999px"), "weekly focus counts use visible badges");
expect(home.includes("home-reference-workspace") && home.includes("home-reference-focus"), "responsive system targets the live Home structure");

console.log(`v144.60 QA passed (${checks.length} checks).`);
