import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasConcreteProductPageProof,
  haveProductTitlesIdentityAgreement,
} from "../lib/productEngineV2.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

assert.equal(
  haveProductTitlesIdentityAgreement(
    "Salomon Sportstyle XT-6 sneakers",
    "Salomon XT-6 Sportstyle"
  ),
  true,
  "A product result and its verified product page may use a different word order"
);
assert.equal(
  haveProductTitlesIdentityAgreement(
    "Kids new arrivals",
    "Salomon XT-6 Sportstyle"
  ),
  false,
  "A category result must not borrow the identity of a product card embedded on the page"
);
assert.equal(
  haveProductTitlesIdentityAgreement(
    "Smartrike",
    "Smartrike STR7 folding stroller"
  ),
  false,
  "A one-word brand page must not become a product merely because an embedded card repeats the brand"
);
assert.equal(
  hasConcreteProductPageProof({
    url: "https://example.test/se/sv/brand/product-name_33039377/16258962",
  }),
  true,
  "An established product-detail URL remains compatible with persisted catalog rows"
);
assert.equal(
  hasConcreteProductPageProof({
    url: "https://example.test/eu/en/brand/kids",
    product_schema_verified: true,
  }),
  false,
  "Product schema embedded on a category page is not concrete product proof"
);
assert.equal(
  hasConcreteProductPageProof({
    url: "https://example.test/unusual-route",
    concrete_product_verified: true,
  }),
  true,
  "A generic ecommerce system can verify a real product without a known URL pattern"
);

const titleThemeFunction = route.slice(
  route.indexOf("function extractCampaignTitleThemeTerms"),
  route.indexOf("function extractCampaignCoreThemeTerms")
);
const coreThemeFunction = route.slice(
  route.indexOf("function extractCampaignCoreThemeTerms"),
  route.indexOf("function countCampaignThemeTermMatchesInText")
);
assert.match(titleThemeFunction, /return contract\.essentialThemeTerms/);
assert.match(coreThemeFunction, /return contract\.essentialThemeTerms/);
assert.doesNotMatch(
  coreThemeFunction,
  /return contract\.approvedThemeTerms/,
  "Audience and broad search vocabulary must not become direct theme proof"
);

const fastReviewFormatter = route.slice(
  route.indexOf("function formatProductsForCampaignFitPrompt"),
  route.indexOf("function getReasoningOptionsForModel")
);
assert.doesNotMatch(fastReviewFormatter, /found_by_query|source_search_url/);
assert.doesNotMatch(fastReviewFormatter, /Discovery source|Retailer search/);

const finalReviewFormatter = route.slice(
  route.indexOf("function formatCampaignFinalReviewCandidates"),
  route.indexOf("function applyCampaignFinalReviewEvaluation")
);
assert.doesNotMatch(finalReviewFormatter, /found_by_query|source_search_url/);
assert.doesNotMatch(finalReviewFormatter, /Fast screening reason/);

assert.match(route, /CAMPAIGN_AI_REVIEW_MAX_ITEMS/);
assert.match(
  route,
  /Campaign store-search progressive AI review batch finished/
);
assert.match(route, /getReviewedOrDirectCampaignProductCandidates/);
assert.match(route, /concrete_product_verified: concreteProductProof/);
assert.match(
  route,
  /verification_metadata:\s*\{[\s\S]{0,200}concrete_product_verified:/
);
assert.match(route, /persistedConcreteProductProof/);
assert.match(route, /CAMPAIGN_FINAL_REVIEW_SHORTLIST_LIMIT = 15/);
assert.match(route, /buildBoundedCampaignFinalReviewFallback/);
assert.match(
  route,
  /preserving verified delivery candidates/,
  "A failed optional AI batch must preserve the delivery pool"
);

console.log("v143.5 semantic campaign curation regression tests passed.");
