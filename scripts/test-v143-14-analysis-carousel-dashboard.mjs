import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const analysisSource = fs.readFileSync(
  path.join(root, "app/api/analyze-brand/brandAnalysisEngine.js"),
  "utf8"
);
const automationSource = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const dashboardSource = fs.readFileSync(
  path.join(root, "app/page.jsx"),
  "utf8"
);
const globalsSource = fs.readFileSync(
  path.join(root, "app/globals.css"),
  "utf8"
);
const dashboardCss = fs.readFileSync(
  path.join(root, "app/styles/38-v143-14-dashboard-studio-refresh.css"),
  "utf8"
);

const metadataGateStart = analysisSource.indexOf(
  "function campaignNeedsProductMetadata"
);
const metadataGateEnd = analysisSource.indexOf(
  "function mergeCampaignProductMetadata",
  metadataGateStart
);
const metadataGateSource = analysisSource.slice(
  metadataGateStart,
  metadataGateEnd
);
assert.ok(metadataGateStart >= 0 && metadataGateEnd > metadataGateStart);
assert.match(metadataGateSource, /matchTerms\.length < 8/);
assert.match(metadataGateSource, /searchQueries\.length < 6/);
assert.doesNotMatch(
  metadataGateSource,
  /return \["product",\s*"service"\]\.includes\(strategy\);/,
  "complete product campaigns must not trigger an unconditional second AI pass"
);

const repairStart = analysisSource.indexOf(
  "async function repairCampaignProductMetadataWithOpenAI"
);
const repairEnd = analysisSource.indexOf(
  "export function slugify",
  repairStart
);
const repairSource = analysisSource.slice(repairStart, repairEnd);
assert.match(repairSource, /WEBSITE_PRODUCT_METADATA_REPAIR_TIMEOUT_MS/);
assert.match(repairSource, /maxRetries:\s*0/);
assert.match(repairSource, /const parsed = safeJsonParse\(content\)/);
assert.doesNotMatch(
  repairSource,
  /parseOpenAIJsonWithRepair/,
  "the optional refinement must not launch another unbounded JSON-repair call"
);

const smallDimensionStart = automationSource.indexOf(
  "function hasSmallImageDimensionHint"
);
const smallDimensionEnd = automationSource.indexOf(
  "function isLowQualityProductImageUrl",
  smallDimensionStart
);
const smallDimensionSource = automationSource.slice(
  smallDimensionStart,
  smallDimensionEnd
);
assert.match(smallDimensionSource, /\[x×\]/);
assert.doesNotMatch(
  smallDimensionSource,
  /\[x×_-\]/,
  "product hashes and IDs must not be treated as width-height markers"
);

const explicitDimensionPattern =
  /(?:^|[^0-9])([1-9][0-9]{1,3})[x×]([1-9][0-9]{1,3})(?:[^0-9]|$)/g;
const teamSportiaImage =
  "https://www.teamsportia.se/wp-content/uploads/2026/07/020377_7323345230820_Casall_H26_46aadf6302.jpg";
assert.equal(
  [...teamSportiaImage.toLowerCase().matchAll(explicitDimensionPattern)].length,
  0,
  "H26_46 in a real 2000px product filename must not look like a 26x46 thumbnail"
);
assert.equal(
  [..."product-320x480.jpg".matchAll(explicitDimensionPattern)].length,
  1,
  "a real 320x480 filename marker must still be detected"
);

assert.match(automationSource, /function hasVerifiedLargeProductImage/);
assert.match(automationSource, /function isUsableProductImageForItem/);
assert.match(
  automationSource,
  /websiteItems = fillCarouselProductSelection\(\s*usablePrimaryItems,\s*\[resolvedReserveItems\]/s,
  "failed primary image slots must be replenished from the existing reserve pool"
);
assert.match(
  automationSource,
  /const carouselProducts = fillCarouselProductSelection\(\s*getCarouselProducts\(rule\),\s*\[rule\?\.website_reserve_items \|\| \[\]\]/s,
  "the final slide save must make one last reserve-pool fill"
);

assert.match(dashboardSource, /dashboard-stat-icon/);
assert.match(dashboardSource, /CalendarClock/);
assert.match(
  globalsSource,
  /38-v143-14-dashboard-studio-refresh\.css/
);
assert.match(dashboardCss, /AI Content Studio/);
assert.match(dashboardCss, /@media \(max-width: 1100px\)/);
assert.match(dashboardCss, /@media \(max-width: 780px\)/);
assert.match(dashboardCss, /@media \(max-width: 520px\)/);
assert.match(
  dashboardCss,
  /\.spreelo-sidebar\.mobile-open\s*\{\s*transform:\s*translateX\(0\)/s,
  "tablet and mobile must use the menu drawer instead of placing the sidebar below content"
);

console.log("v143.14 analysis, carousel and dashboard regression tests passed.");
