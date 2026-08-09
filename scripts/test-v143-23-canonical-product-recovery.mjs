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
  const end = route.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `Could not extract ${name}`);
  return route.slice(start, end);
}

const repair = extractFunction(
  "repairAuthoritativeWebAgentProductAssets",
  "hydrateAuthoritativeWebAgentProduct"
);
assert.match(repair, /automationOccurrenceId = null/);
assert.match(repair, /repairResearchSlot/);
assert.match(repair, /CAMPAIGN_PRIMARY_WEB_RESEARCH_MAX_ROUNDS/);
assert.match(repair, /getDurableCampaignResearchResponse/);
assert.match(repair, /researchRound: repairResearchSlot/);
assert.match(repair, /Confirm that it loads as a live product page rather than a 404/);

const primary = extractFunction(
  "findPrimaryCampaignProductsWithWebSearch",
  "getCampaignRoleTokens"
);
assert.match(primary, /blockedWebsiteItems = \[\]/);
assert.match(primary, /HARD TECHNICAL EXCLUSIONS/);
assert.match(primary, /Never return these URLs again/);
assert.match(primary, /blockedProducts/);
assert.match(primary, /automationOccurrenceId,/);
assert.match(primary, /supabase,/);
assert.match(
  primary,
  /error\?\.code === "CAMPAIGN_RESEARCH_BACKGROUND_PENDING"[\s\S]*throw error;/
);

const outerCall = route.slice(
  route.indexOf("let researchExclusions ="),
  route.indexOf("const firstResearchRound =")
);
assert.match(outerCall, /blockedWebsiteItems: combinedCandidates/);
assert.match(outerCall, /researchExclusions = \[\.\.\.recentUsedItems\]/);

const hydrate = extractFunction(
  "hydrateAuthoritativeWebAgentProduct",
  "createCampaignResearchPendingError"
);
assert.match(hydrate, /technicalPageRateLimited[\s\S]*console\.warn[\s\S]*console\.info/);
assert.match(
  hydrate,
  /console\.info\("Authoritative product page did not expose one lockable main-product object"/,
  "authoritative recovery must fail closed when one exact main-product object cannot be locked"
);
assert.match(hydrate, /extractLockedProductObjectFromHtml/);
assert.doesNotMatch(hydrate, /extractBestProductImageFromHtml|collectProductImageCandidates/);
assert.match(
  route,
  /console\.warn\("Final clean-product image review was unavailable; keeping only identity-verified images"/
);
assert.match(route, /timeout: 30_000/);

assert.doesNotMatch(
  route,
  /horze\.se|zalando\.se|isover\.(?:se|com)/i,
  "Canonical recovery must remain retailer independent"
);

console.log("v143.23 canonical product recovery checks passed.");
