import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);
const resolver = fs.readFileSync(
  path.join(root, "lib/productImageResolver.js"),
  "utf8"
);
const migration = fs.readFileSync(
  path.join(root, "supabase/v143_22_durable_campaign_research.sql"),
  "utf8"
);

function extractFunction(name, nextName) {
  const start = route.indexOf(`function ${name}`);
  const end = route.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `Could not extract ${name}`);
  return route.slice(start, end);
}

const durable = extractFunction(
  "getDurableCampaignResearchResponse",
  "findPrimaryCampaignProductsWithWebSearch"
);
assert.match(durable, /automation_campaign_research_jobs/);
assert.match(durable, /background: true/);
assert.match(durable, /store: true/);
assert.match(durable, /openai\.responses\.retrieve/);
assert.match(durable, /Idempotency-Key/);
assert.match(route, /CAMPAIGN_RESEARCH_BACKGROUND_PENDING/);
assert.match(durable, /output_text/);

assert.match(migration, /create table if not exists public\.automation_campaign_research_jobs/);
assert.match(migration, /unique \(occurrence_id, research_round\)/);
assert.match(migration, /defer_automation_occurrence_for_campaign_research/);
assert.match(migration, /status = 'retry_pending'/);
assert.match(migration, /same_credit|generation_refunded_credits = 0/);

const primary = extractFunction(
  "findPrimaryCampaignProductsWithWebSearch",
  "getCampaignRoleTokens"
);
assert.match(primary, /getDurableCampaignResearchResponse/);
assert.match(primary, /failedTopFiveCandidates/);
assert.match(primary, /Duplicate primary image triggered exact selected-product repair/);
assert.match(primary, /lockedTopFiveRepairCount/);

const selector = extractFunction(
  "selectLockedPrimaryCampaignProducts",
  "finalizeCarouselFromPrimaryCampaignWebResearch"
);
assert.match(selector, /intendedTopFive/);
assert.match(selector, /scoreCampaignRoleReplacement/);
assert.match(selector, /role_matched_reserve/);
assert.match(selector, /campaign_replacement_for_rank/);

const imageReview = extractFunction(
  "reviewCarouselProductOnlyImages",
  "fetchImageBufferForOverlay"
);
assert.match(imageReview, /clean_product_only/);
assert.match(imageReview, /contains_person/);
assert.match(imageReview, /contains_animal/);
assert.match(imageReview, /matches_product/);
assert.match(imageReview, /product_image_clean_product_verified: false/);
assert.match(imageReview, /timeout: (?:15_000|30_000)/);

assert.match(resolver, /identityUnresolved: true/);
assert.match(resolver, /verifiedCandidates: \[\]/);
assert.doesNotMatch(
  resolver,
  /const safePool = selectionPool\.length[\s\S]*nonPrimaryFallback/,
  "An unverified large image must never be selected as a product image"
);

const carouselCatchIndex = route.indexOf("} catch (carouselError)");
const catchIndex = route.indexOf(
  '"CAMPAIGN_RESEARCH_BACKGROUND_PENDING"',
  carouselCatchIndex
);
const fallbackIndex = route.indexOf(
  "const canUseCampaignDeliveryFallback =",
  catchIndex
);
assert.ok(catchIndex >= 0 && fallbackIndex > catchIndex);

assert.doesNotMatch(
  `${route}\n${resolver}\n${migration}`,
  /horze\.se|zalando\.se|isover\.(?:se|com)/i,
  "The repair must remain generic and retailer independent"
);

console.log("v143.22 durable campaign and carousel integrity checks passed.");
