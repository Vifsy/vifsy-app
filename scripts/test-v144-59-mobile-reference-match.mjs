import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(message);
  checks.push(message);
};

const globals = read("app/globals.css");
const css = read("app/styles/59-v144-59-mobile-reference-match.css");
const home = read("components/HomeReferenceOverview.jsx");
const layout = read("components/AppLayout.jsx");
const automation = read("app/automation/page.jsx");

expect(globals.trimEnd().endsWith('@import "./styles/59-v144-59-mobile-reference-match.css";'), "v144.59 is the final cascade layer");
expect(css.includes("@media (max-width:900px)") && css.includes(".plan-v14341-studio-hero { display:none"), "mobile plan view removes the desktop studio hero");
expect(css.includes(".plan-v14459-platform-tile { order:5") && css.includes(".plan-v14459-publishing-tile { order:6"), "platform appears before publishing on mobile");
expect(css.includes(".plan-v14459-platform-menu:not(.is-open)") && css.includes("display:grid !important"), "mobile platform chooser stays visibly expanded");
expect(automation.includes("plan-v14459-platform-chooser-label") && automation.includes("plan-v14459-platform-value"), "platform chooser has mobile value and helper copy");
expect(automation.includes('window.matchMedia("(max-width: 900px)")') && automation.includes("setGuideExpanded(false)"), "mobile guide starts compact");
expect(layout.includes("spreelo-mobile-brand-chevron"), "mobile brand strip includes the reference chevron");
expect(home.includes("home-reference-credit-mobile-label") && home.includes("Visa innehållskalender"), "overview uses the reference mobile credit and calendar labels");
expect(css.includes("grid-template-columns:40px minmax(0,1fr) auto") && css.includes("min-height:62px"), "overview statistics use the compact reference rhythm");
expect(css.includes(".home-reference-review > svg") && css.includes("background:#0d2943"), "overview approval card uses the circular icon treatment");

console.log(`v144.59 QA passed (${checks.length} checks).`);
