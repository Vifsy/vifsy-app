import assert from "node:assert/strict";
import fs from "node:fs";
import {
  evaluateCampaignProductRelevance,
  rankDefensibleCampaignCandidates,
} from "../lib/campaignProductRelevance.js";

const contextual = (name, score, role, evidence, usedRecently = false) => ({
  name,
  directMatches: 0,
  aiScore: score,
  verdict: "strong",
  relevanceClass: "contextual",
  campaignRole: role,
  evidence: [evidence],
  reason: `${name} has a specific, verified role in this campaign.`,
  usedRecently,
});

const direct = (name, score, usedRecently = false) => ({
  name,
  directMatches: 1,
  aiScore: score,
  verdict: "strong",
  relevanceClass: "direct",
  campaignRole: "Direct expression of the campaign theme",
  evidence: [`${name} contains direct product-level theme evidence`],
  reason: `${name} directly expresses the campaign theme in verified product data.`,
  usedRecently,
});

function assertCampaignCanCurateFive(name, candidates) {
  const selected = rankDefensibleCampaignCandidates(candidates, 5);
  assert.equal(selected.length, 5, `${name} should produce five defensible products`);
  for (const product of selected) {
    assert.equal(product.relevance.meaningful, true);
    assert.ok(product.relevance.campaignRole.length >= 3);
    assert.ok(product.relevance.evidence.length >= 1);
  }
  assert.ok(
    selected.some((product) => product.relevance.tier === "contextual"),
    `${name} should permit evidenced contextual fit`
  );
  assert.ok(
    selected.some((product) => product.relevance.tier === "direct"),
    `${name} should still prefer direct theme evidence`
  );
  return selected;
}

const christmasSelection = assertCampaignCanCurateFive("Christmas", [
  direct("Christmas motif sweater", 96, true),
  direct("Santa print mug", 93),
  contextual(
    "Silver earrings",
    89,
    "A polished present option for an adult recipient",
    "Verified sterling-silver earrings supplied in a presentation box"
  ),
  contextual(
    "Leather weekend bag",
    87,
    "A substantial practical present in the premium slot",
    "Verified full-grain leather bag with travel capacity"
  ),
  contextual(
    "Fragrance set",
    85,
    "A ready-made beauty present option",
    "Verified multi-item fragrance set in retail packaging"
  ),
  {
    name: "Gift card",
    directMatches: 0,
    aiScore: 99,
    verdict: "strong",
    relevanceClass: "generic",
    campaignRole: "Generic gift",
    evidence: ["Digital gift card"],
    reason: "This is only broadly giftable and has no campaign-specific role.",
  },
]);
assert.ok(
  christmasSelection.some((product) => product.name === "Christmas motif sweater"),
  "Recent use must be a ranking preference, not a ban on the strongest product"
);

assertCampaignCanCurateFive("Halloween", [
  direct("Pumpkin print hoodie", 97),
  direct("Ghost lantern", 94),
  contextual(
    "Black taper candle set",
    88,
    "Atmospheric table styling for the Halloween setting",
    "Verified black taper candles intended for decorative table use"
  ),
  contextual(
    "Orange serving bowl",
    84,
    "Seasonal party-serving role",
    "Verified orange serving bowl sized for snacks"
  ),
  contextual(
    "Dark theatrical cape",
    91,
    "Wearable costume-building piece",
    "Verified full-length black cape described as costume apparel"
  ),
]);

assertCampaignCanCurateFive("Easter", [
  direct("Easter bunny decoration", 96),
  direct("Egg motif tea towel", 92),
  contextual(
    "Pastel table runner",
    86,
    "Foundation for a seasonal Easter table",
    "Verified washable pastel table runner for dining tables"
  ),
  contextual(
    "Ceramic serving platter",
    84,
    "Serving role for the holiday meal",
    "Verified food-safe ceramic platter for shared dining"
  ),
  contextual(
    "Spring flower vase",
    82,
    "Seasonal centerpiece role",
    "Verified glass vase sized for cut-flower arrangements"
  ),
]);

const unsupportedContext = evaluateCampaignProductRelevance({
  directMatches: 0,
  aiScore: 98,
  verdict: "strong",
  relevanceClass: "contextual",
  campaignRole: "Gift",
  evidence: [],
  reason: "It would make a nice gift.",
});
assert.equal(
  unsupportedContext.meaningful,
  false,
  "Contextual fit without auditable product evidence must not pass"
);

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.match(route, /generateCampaignCarouselMarketingStrategy/);
const prepareStart = route.indexOf("async function prepareCarouselProductsForRule");
const prepareEnd = route.indexOf("async function createAutomationRunLog", prepareStart);
assert.doesNotMatch(
  route.slice(prepareStart, prepareEnd),
  /generateCampaignCarouselMarketingStrategy\(\{/,
  "The final senior model must not block product discovery"
);
assert.match(route, /contextual_product_directions/);
assert.match(route, /relevance_class/);
assert.match(route, /campaign_role/);
assert.match(route, /campaign_relevance_evidence/);
assert.match(route, /isCampaignQueryContextuallySupported/);
assert.match(route, /CAMPAIGN_FINAL_REVIEW_RESERVE_MS = 55_000/);
assert.match(
  route,
  /productPreparationCompletionDeadline[\s\S]{0,240}CAMPAIGN_FINAL_REVIEW_RESERVE_MS/
);
assert.match(route, /CAMPAIGN_FINAL_REVIEW_TIMEOUT_MS \|\| 25_000/);
assert.match(route, /excludeUsed: false/);
assert.match(
  route,
  /Campaign rate-limit resume is using verified catalog before any new website request/
);
assert.match(route, /getWebsiteSearchLanguageHint/);
assert.match(route, /shelf_already_exhausted/);
assert.doesNotMatch(
  route,
  /tool_choice:\s*"required",\s*reasoning:\s*\{\s*effort:\s*"low"/
);

console.log("v143 semantic product-fit and bounded-delivery tests passed.");
