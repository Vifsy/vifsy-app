import assert from "node:assert/strict";
import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const layout = read("components/AppLayout.jsx");
const brand = read("app/brand/page.jsx");
const styles = read("app/styles/42-v143-28-brand-review-workflow.css");
const labels = read("lib/i18n/defaultLabels.js");

assert.match(layout, /\/brand\?analyze=1&brand=/);
assert.match(layout, /layout\.analyzeBrandWebsite/);
assert.match(labels, /"layout\.analyzeBrandWebsite": "Analyze website"/);

assert.match(brand, /autoAnalysisStartedRef/);
assert.match(brand, /autoAnalyzeRequested/);
assert.match(brand, /window\.history\.replaceState/);
assert.match(brand, /analyzeBrand\(\);/);
assert.match(brand, /brand-profile-edit-button/);
assert.match(brand, /setIsEditing\(false\)/);
assert.doesNotMatch(brand, /brand-profile-step-list/);

assert.match(styles, /background: #f5f7fb !important/);
assert.match(styles, /Brand Profile follows the calmer AI Content Studio canvas/);
assert.match(styles, /max-width: 1180px !important/);
assert.match(styles, /@media \(max-width: 640px\)/);

console.log("v143.29 brand profile redesign and automatic analysis checks passed.");
