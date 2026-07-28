import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateSimpleCampaignThemeFit } from "../lib/campaignThemeFit.js";

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

const languageHintSource = extractFunction(
  "getWebsiteSearchLanguageHint",
  "applyCampaignMarketingStrategyToRule"
);
const getWebsiteSearchLanguageHint = new Function(
  "normalizeCampaignStrategyText",
  `${languageHintSource}; return getWebsiteSearchLanguageHint;`
)((value) => String(value || "").trim());

assert.equal(
  getWebsiteSearchLanguageHint({
    websiteUrl: "https://shop.example/eu/en/women/view-all",
    brandProfile: { content_language: "Swedish" },
    rule: { language: "Swedish" },
  }),
  "English retailer search terms; campaign copy language is Swedish",
  "A region segment such as /eu/ must not hide the actual /en/ storefront language"
);
assert.equal(
  getWebsiteSearchLanguageHint({
    websiteUrl: "https://shop.example/se/sv/women/view-all",
    brandProfile: { content_language: "Swedish" },
    rule: { language: "Swedish" },
  }),
  "Swedish retailer search terms; campaign copy language is Swedish"
);

const searchBaseSource = extractFunction(
  "getWebsiteSearchBaseUrls",
  "buildStoreSearchUrls"
);
const getWebsiteSearchBaseUrls = new Function(
  "getWebsiteOrigin",
  `${searchBaseSource}; return getWebsiteSearchBaseUrls;`
)((value) => new URL(value).origin);

assert.deepEqual(
  getWebsiteSearchBaseUrls(
    "https://www.example.test/eu/en/women/view-all"
  ),
  [
    "https://www.example.test/eu/en",
    "https://www.example.test",
  ],
  "Store search must retain the configured market/language path before trying the bare origin"
);
assert.deepEqual(
  getWebsiteSearchBaseUrls("https://www.example.test/collections/t-shirts"),
  ["https://www.example.test"]
);

assert.equal(
  evaluateSimpleCampaignThemeFit({
    fitsTheme: false,
    verdict: "does_not_fit",
    score: 95,
  }).rejected,
  true,
  "An explicit rejection must win even when a numeric score is high"
);

const rejectionFunction = extractFunction(
  "isCampaignFitRejectedForRule",
  "isCampaignThemeFitApproved"
);
assert.match(
  rejectionFunction,
  /return isExplicitCampaignFitRejected\(item\)/
);
assert.doesNotMatch(
  rejectionFunction,
  /hasDirectCampaignEvidenceForRule/,
  "Search/theme keywords must not revive an explicitly rejected product"
);

const finalRelevanceFunction = extractFunction(
  "getCampaignFinalEvaluationRelevance",
  "selectCampaignCarouselProductsWithSeniorFinalReview"
);
assert.match(finalRelevanceFunction, /const rejected = fitDecision\.rejected/);
assert.match(
  finalRelevanceFunction,
  /const approved = !rejected && \(directApproved \|\| fitDecision\.approved\)/
);
assert.doesNotMatch(
  finalRelevanceFunction,
  /evaluation\?\.reason|evaluation\?\.campaignRole/,
  "The senior model's explanatory text must not become product-level theme proof"
);

const finalReviewReconciliation = route.slice(
  route.indexOf("const recoveredFromFastThemeFit = false"),
  route.indexOf("const titleThemeSelectedCount")
);
assert.match(
  finalReviewReconciliation,
  /const evaluatedShortlist = shortlist\.flatMap/
);
assert.doesNotMatch(
  finalReviewReconciliation,
  /buildBoundedCampaignFinalReviewFallback/,
  "A valid senior rejection must not be replaced by the earlier fast selection"
);

assert.match(
  route,
  /structuredCommerceProductProof[\s\S]{0,300}productSchemaFound[\s\S]{0,200}ecommerceProofFound/
);
assert.match(
  route,
  /productUrlProof \|\|[\s\S]{0,120}productTitleIdentityProof \|\|[\s\S]{0,120}structuredCommerceProductProof/
);
assert.match(
  route,
  /Include at least one very short retailer-native head query/
);
assert.match(
  route,
  /const prioritizedGroups = Array\.from\(grouped\.entries\(\)\)/
);

console.log("v143.8 storefront search and rejection-authority tests passed.");
