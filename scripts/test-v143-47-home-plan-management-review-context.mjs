import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [home, css, labels, builtIn] = await Promise.all([
  readFile(new URL("../app/page.jsx", import.meta.url), "utf8"),
  readFile(new URL("../app/styles/38-current-experience-v143.css", import.meta.url), "utf8"),
  readFile(new URL("../lib/i18n/defaultLabels.js", import.meta.url), "utf8"),
  readFile(new URL("../lib/i18n/builtInLocaleLabels.js", import.meta.url), "utf8"),
]);

assert.match(home, /home-v14347-plan-delete/);
assert.match(home, /<Trash2 aria-hidden="true"/);
assert.match(home, /toggleHomePlan/);
assert.match(home, /expandedHomePlanIds/);
assert.match(home, /showAllHomePlans/);
assert.match(home, /dashboard\.showAllActivePlans/);
assert.match(home, /dashboard\.plannedPostsInPlan/);
assert.match(home, /formatPlanRuleSchedule/);
assert.match(home, /formatRuleContentType/);
assert.match(home, /content_type_id, content_type_label, content_format, queue_source/);
assert.match(home, /getReviewContext/);
assert.match(home, /isGenericWebsiteReviewLabel/);
assert.match(home, /dashboard\.reviewSourceCampaign/);
assert.match(home, /dashboard\.reviewSourceStudio/);
assert.doesNotMatch(home, /dashboardPreviewPlans/);

assert.match(css, /v143\.47 — Home plan management and richer review context/);
assert.match(css, /\.home-v14347-plan-details/);
assert.match(css, /\.home-v14347-plan-delete:hover/);
assert.match(css, /\.home-v14347-plan-detail time/);
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.home-v14347-plan-row/);

for (const key of [
  "dashboard.showAllActivePlans",
  "dashboard.deletePlan",
  "dashboard.plannedPostsInPlan",
  "dashboard.reviewSourceCampaign",
  "dashboard.contentType.productCarousel",
  "dashboard.contentType.animatedProductReel",
]) {
  assert.match(labels, new RegExp(key.replaceAll(".", "\\.")));
  assert.match(builtIn, new RegExp(key.replaceAll(".", "\\.")));
}

console.log("v143.47 Home plan management and review context checks passed.");
