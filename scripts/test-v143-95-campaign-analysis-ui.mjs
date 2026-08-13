import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const babelParser = require("../node_modules/next/dist/compiled/babel/parser.js");

const jsxFiles = [
  "app/automation/page.jsx",
  "app/brand/page.jsx",
  "app/settings/page.jsx",
  "components/SettingsPanels.jsx",
  "components/AppLayout.jsx",
  "app/page.jsx",
  "lib/i18n/defaultLabels.js",
  "lib/i18n/builtInLocaleLabels.js",
];

for (const file of jsxFiles) {
  babelParser.parse(fs.readFileSync(file, "utf8"), {
    sourceType: "module",
    plugins: ["jsx"],
  });
}

const automation = fs.readFileSync("app/automation/page.jsx", "utf8");
assert.match(automation, /campaign-v14395-plan-controls/);
assert.match(automation, /applyPlatformSelection/);
assert.match(automation, /campaign-language-/);
assert.match(automation, /automation\.hidePostDetails/);
assert.match(automation, /campaign-v14395-detail-close/);

const analysis = fs.readFileSync("app/brand/page.jsx", "utf8");
assert.match(analysis, /brand-analysis-brandline/);
assert.match(analysis, /brand-analysis-percent/);

const layout = fs.readFileSync("components/AppLayout.jsx", "utf8");
assert.doesNotMatch(layout, /className="spreelo-user-avatar-remove"/);

const settings = fs.readFileSync("components/SettingsPanels.jsx", "utf8");
assert.match(settings, /requestProfileImageRemove/);

const home = fs.readFileSync("app/page.jsx", "utf8");
assert.match(home, /plan\.anyActive \|\| plan\.hasFutureRun/);

const css = fs.readFileSync("app/styles/53-v143-95-campaign-analysis-polish.css", "utf8");
assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length);

console.log("v143.95 campaign, analysis, profile and home UI contract passed.");
