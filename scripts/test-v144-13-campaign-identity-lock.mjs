import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cron/run-automations/route.js", "utf8");

assert.match(
  route,
  /function getCampaignIdentityLock\(rule\)[\s\S]{0,5000}themeContract\?\.primaryTheme[\s\S]{0,5000}competingThemeTerms/,
  "Campaign identity lock must be derived from the existing semantic campaign/theme contract"
);

assert.match(
  route,
  /function formatCampaignIdentityLockForPrompt\(rule\)[\s\S]{0,5000}one and only campaign identity[\s\S]{0,5000}changing or blending the campaign identity is forbidden/,
  "Campaign lock prompt must forbid cross-campaign blending"
);

assert.match(
  route,
  /function buildAutomationPrompt\(rule\)[\s\S]{0,5000}campaignIdentityLockText = formatCampaignIdentityLockForPrompt\(rule\)[\s\S]{0,5000}\$\{campaignIdentityLockText\}/,
  "Main post copy prompt must receive the campaign identity lock"
);

assert.match(
  route,
  /function formatCampaignVisualContextForPrompt\(rule\)[\s\S]{0,3500}formatCampaignIdentityLockForPrompt\(rule\)[\s\S]{0,1500}Campaign visual context:/,
  "All campaign visual prompts using the shared visual context must inherit the campaign lock"
);

assert.match(
  route,
  /function buildWebsiteItemAdImagePrompt\(rule, postContent\)[\s\S]{0,9000}CAMPAIGN IDENTITY LOCK[\s\S]{0,1200}authoritative over the User instruction, Final post text, product context/,
  "AI product ads must treat the campaign lock as authoritative even if supporting copy is contaminated"
);

assert.match(
  route,
  /async function validateProductCopyIdentityWithModel\([\s\S]{0,9000}campaign_valid[\s\S]{0,2500}conflicting_campaign_mentions[\s\S]{0,5000}parsed\?\.valid === true && campaignValid/,
  "Existing product identity validation call must also reject cross-campaign copy without adding a new validation request"
);

assert.match(
  route,
  /async function rewriteProductCopyToExactContract\([\s\S]{0,7000}formatCampaignIdentityLockForPrompt\(rule\)[\s\S]{0,2500}remove every reference to another named campaign\/holiday\/occasion/,
  "Existing safe rewrite path must repair a campaign mismatch instead of failing the post"
);

assert.match(
  route,
  /async function generateProductCarouselSlides\([\s\S]{0,9000}formatCampaignIdentityLockForPrompt\(rule\)[\s\S]{0,2000}all carousel copy and the final outro must stay inside that one campaign/,
  "Carousel slide/outro copy must inherit the same campaign lock"
);

assert.match(
  route,
  /async function buildKlingProductVideoPrompt\([\s\S]{0,6500}formatCampaignIdentityLockForPrompt\(rule\)[\s\S]{0,1600}must stay exclusively inside that active campaign/,
  "Kling creative direction must inherit the same campaign identity"
);

// v144.13 must not weaken the proven product delivery / exact-image safety chain.
assert.match(
  route,
  /allowIndexedSecurityFallback = false/,
  "Existing 403 exact-product fallback default safety must remain unchanged"
);
assert.match(
  route,
  /product_identity_locked:\s*true[\s\S]{0,1800}locked_product_primary_image_url:\s*imageUrl/,
  "Exact original product-image lock must remain in place"
);
assert.match(
  route,
  /Product Engine V2 skipped direct reserve discovery for indexed 403 product/,
  "v144.11 delivery optimization must remain present"
);

console.log("v144.13 campaign identity lock checks passed");

// Execute the actual helper functions with small deterministic stubs so the
// Black Friday -> Father's Day regression is covered without making any API call.
const helperStart = route.indexOf("function getCampaignIdentityLock(rule)");
const helperEnd = route.indexOf("function formatCampaignVisualContextForPrompt(rule)", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, "Could not extract campaign lock helpers");
const helperSource = route.slice(helperStart, helperEnd);

const factory = new Function(
  "isCampaignScopedWebsiteRule",
  "getCampaignThemeContract",
  "normalizeCampaignMarketingStrategy",
  "extractPromptLineValue",
  "normalizeCampaignStrategyText",
  "collectUniqueTerms",
  "extractExplicitCampaignMatchTerms",
  "normalizeSearchText",
  `${helperSource}\nreturn { getCampaignIdentityLock, formatCampaignIdentityLockForPrompt };`
);

const normalize = (value) => String(value || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const splitUnique = (values, limit = 30) => {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const text = String(value || "").trim();
    const key = normalize(text);
    if (!text || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= limit) break;
  }
  return out;
};
const promptLine = (text, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&");
  const match = String(text || "").match(new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() || "";
};
const { getCampaignIdentityLock, formatCampaignIdentityLockForPrompt } = factory(
  (rule) => Boolean(rule?.campaign_phase || rule?.campaign_goal || rule?.campaign_post_index),
  (rule) => rule?.campaign_theme_contract || null,
  (value) => value || null,
  promptLine,
  (value, maxLength = 500) => String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength),
  splitUnique,
  (rule) => rule?.product_match_terms || [],
  normalize
);

const blackFridayRule = {
  campaign_phase: "conversion",
  campaign_goal: "Black Friday sales",
  name: "Black Friday 2026",
  prompt: "Campaign: Black Friday 2026\nCreate a strong product ad.",
  product_match_terms: ["black friday", "black week"],
  campaign_theme_contract: {
    primaryTheme: "Black Friday",
    approvedThemeTerms: ["Black Friday", "Black Week"],
    essentialThemeTerms: ["Black Friday"],
    competingThemeTerms: ["Fars dag", "Mors dag", "Påsk"],
  },
};
const blackFridayLock = getCampaignIdentityLock(blackFridayRule);
assert.equal(blackFridayLock.activeCampaign, "Black Friday");
assert.deepEqual(blackFridayLock.competingThemeTerms, ["Fars dag", "Mors dag", "Påsk"]);
const blackFridayPrompt = formatCampaignIdentityLockForPrompt(blackFridayRule);
assert.match(blackFridayPrompt, /Active campaign \/ occasion: Black Friday/);
assert.match(blackFridayPrompt, /Fars dag, Mors dag, Påsk/);
assert.match(blackFridayPrompt, /one and only campaign identity/);
assert.equal(formatCampaignIdentityLockForPrompt({}), "");

console.log("v144.13 executable Black Friday campaign-lock scenario passed");
