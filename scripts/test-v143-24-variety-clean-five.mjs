import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

function extractFunction(name, nextName) {
  const start = route.indexOf(`function ${name}`);
  const syncEnd = route.indexOf(`function ${nextName}`, start + 1);
  const asyncEnd = route.indexOf(`async function ${nextName}`, start + 1);
  const end = [syncEnd, asyncEnd]
    .filter((value) => value > start)
    .sort((left, right) => left - right)[0];
  assert.ok(start >= 0 && end > start, `Could not extract ${name}`);
  return route.slice(start, end);
}

assert.match(route, /selection_mode:[\s\S]*varied_categories[\s\S]*focused_category/);
assert.match(route, /product_family:[\s\S]*normalized generic product family/);
assert.match(route, /at least four distinct useful product families/);
assert.match(route, /official clean catalogue\/packshot image/);
assert.match(route, /hasAdequatePrimaryCampaignCarouselVariety/);
assert.match(route, /campaign_replacement_reason: "distinct_family_reserve"/);
assert.match(route, /repairAuthoritativeWebAgentProductAssets/);
assert.match(route, /if \(seenUrls\.size >= 4\) break/);

const functionSource = [
  extractFunction("getCampaignProductFamilyKey", "hasAdequatePrimaryCampaignCarouselVariety"),
  extractFunction("hasAdequatePrimaryCampaignCarouselVariety", "getCampaignRoleTokens"),
  extractFunction("getCampaignRoleTokens", "scoreCampaignRoleReplacement"),
  extractFunction("scoreCampaignRoleReplacement", "selectLockedPrimaryCampaignProducts"),
  extractFunction("selectLockedPrimaryCampaignProducts", "finalizeCarouselFromPrimaryCampaignWebResearch"),
].join("\n");

const makeSelectors = new Function(
  "normalizeComparableValue",
  "getPrimaryCampaignResearchRank",
  "CAROUSEL_PRODUCT_SLIDE_TARGET",
  `${functionSource}; return { selectLockedPrimaryCampaignProducts, hasAdequatePrimaryCampaignCarouselVariety };`
);
const normalizeComparableValue = (value) =>
  String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const getRank = (item) => Number(item?.campaign_research_rank || 999);
const { selectLockedPrimaryCampaignProducts, hasAdequatePrimaryCampaignCarouselVariety } =
  makeSelectors(normalizeComparableValue, getRank, 5);

const families = [
  "backpack",
  "backpack",
  "sneakers",
  "jeans",
  "sneakers",
  "pencil case",
  "jacket",
  "water bottle",
  "lunch box",
  "cap",
];
const variedCandidates = families.map((family, index) => ({
  title: `${family} ${index + 1}`,
  campaign_research_rank: index + 1,
  campaign_product_family: family,
  campaign_selection_mode: "varied_categories",
  campaign_role: family,
}));
const varied = selectLockedPrimaryCampaignProducts({
  candidates: variedCandidates,
  validProducts: variedCandidates,
});
assert.equal(varied.selectedProducts.length, 5);
assert.ok(
  new Set(varied.selectedProducts.map((item) => item.campaign_product_family)).size >= 4,
  "A broad campaign must replace redundant families with complementary reserves"
);
assert.ok(
  hasAdequatePrimaryCampaignCarouselVariety(varied.selectedProducts, "varied_categories")
);

const focusedCandidates = variedCandidates.map((item) => ({
  ...item,
  campaign_selection_mode: "focused_category",
}));
const focused = selectLockedPrimaryCampaignProducts({
  candidates: focusedCandidates,
  validProducts: focusedCandidates,
});
assert.deepEqual(focused.selectedProducts.map(getRank), [1, 2, 3, 4, 5]);

assert.doesNotMatch(
  route,
  /horze\.se|zalando\.se|isover\.(?:se|com)/i,
  "The fix must stay retailer independent"
);

console.log("v143.24 variety and clean-five checks passed.");
