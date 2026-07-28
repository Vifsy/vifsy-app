import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const route = fs.readFileSync(
  path.join(root, "app/api/cron/run-automations/route.js"),
  "utf8"
);

const candidateUsageFunction = route.slice(
  route.indexOf("function getCampaignCandidateUsageState"),
  route.indexOf("function isFreshCampaignCandidate")
);
assert.doesNotMatch(
  candidateUsageFunction,
  /\brow\b/,
  "Candidate usage tracking must not reference a catalog row that is outside its scope"
);

const normalizeCatalogFunction = route.slice(
  route.indexOf("function normalizeWebsiteCatalogItem"),
  route.indexOf("const WEBSITE_PRODUCT_CATALOG_LEGACY_SELECT")
);
assert.match(
  normalizeCatalogFunction,
  /const persistedConcreteProductProof\s*=/,
  "Persisted concrete-product proof must be declared inside catalog normalization"
);
assert.match(
  normalizeCatalogFunction,
  /concrete_product_verified:\s*persistedConcreteProductProof/,
  "Catalog normalization must return the locally resolved proof value"
);

assert.match(
  route,
  /console\.error\("Automation occurrence failed terminally"/,
  "Terminal automation failures must expose their internal reason in Vercel logs"
);

console.log("v143.6 runtime scope regression tests passed.");
