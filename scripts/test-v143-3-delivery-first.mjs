import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const routeSource = await readFile(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.match(
  routeSource,
  /\.eq\("automation_rule_id", rule\.id\)/u,
  "Persistent candidate work must be scoped to the current automation rule."
);
assert.match(
  routeSource,
  /brand_profile_id,automation_rule_id,canonical_product_url/u,
  "Candidate queue upserts must use the rule-scoped unique key."
);
assert.match(
  routeSource,
  /isExplicitCampaignFitRejected\(item\) &&\s*!hasDirectCampaignEvidenceForRule\(item, rule\)/u,
  "A broad AI/category rejection must not veto direct evidence in the concrete product."
);
assert.doesNotMatch(
  routeSource,
  /\(\?:pagination\|pager\|page-numbers\|next\)/u,
  "A product anchor containing the word next must not be treated as pagination."
);
assert.match(
  routeSource,
  /new Set\(formSearchUrls\.length \? formSearchUrls : fallbackSearchUrls\)/u,
  "Known retailer search-form URLs must replace guessed search URL patterns."
);
assert.match(
  routeSource,
  /const CAROUSEL_PLATFORM_MIN_PRODUCT_SLIDES = 2;/u,
  "Reduced but valid campaign carousels must support two verified products."
);
assert.match(
  routeSource,
  /Campaign carousel switched to guaranteed delivery fallback/u,
  "Campaign carousel preparation must have a guaranteed delivery fallback."
);
assert.match(
  routeSource,
  /content_format: "single_image"[\s\S]*uses_website_content: false[\s\S]*image_source: "ai"/u,
  "A campaign with no usable product must fall back to an AI campaign visual."
);
assert.match(
  routeSource,
  /rows\.length < productCount \+ CAROUSEL_OUTRO_SLIDE_COUNT/u,
  "Carousel slide validation must use the actual reduced product count."
);

console.log("v143.3 delivery-first campaign regression tests passed.");
