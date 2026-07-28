import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  new URL("../app/api/cron/run-automations/route.js", import.meta.url),
  "utf8"
);

assert.match(
  route,
  /CAROUSEL_PREPARATION_SOFT_DEADLINE_MS[\s\S]{0,220}240_000/
);
assert.match(route, /AUTOMATION_STALE_RUNTIME_MS[\s\S]{0,220}12 \* 60 \* 1000/);
assert.match(route, /CAMPAIGN_FINAL_REVIEW_TIMEOUT_MS[\s\S]{0,220}45_000/);
assert.match(
  route,
  /process\.env\.STRICT_PRODUCT_NO_REUSE \|\| "false"/
);

assert.match(route, /function extractCampaignTitleThemeTerms/);
assert.match(route, /function orderCampaignSearchQueriesThemeFirst/);
assert.match(
  route,
  /Put concrete local-language theme plus product\/category searches first/i
);
assert.match(route, /titleThemeTerms: extractCampaignTitleThemeTerms\(rule\)/);
assert.match(route, /titleThemeCoverageReady/);
assert.match(route, /countCampaignTitleThemeEvidence/);

const prepareStart = route.indexOf("async function prepareCarouselProductsForRule");
const prepareEnd = route.indexOf(
  "async function createAutomationRunLog",
  prepareStart
);
const prepareBlock = route.slice(prepareStart, prepareEnd);

assert.doesNotMatch(
  prepareBlock,
  /generateCampaignCarouselMarketingStrategy\(\{/,
  "Discovery must not spend its budget on an upfront senior strategy."
);
assert.doesNotMatch(
  prepareBlock,
  /runCampaignCurationTargetedRescue\(\{/,
  "A rejected final review must not trigger another discovery and senior-review loop."
);
assert.doesNotMatch(
  prepareBlock,
  /reviewPass: "targeted_rescue"/
);
assert.doesNotMatch(
  route,
  /escalateWhenUncertain: true/,
  "Fast campaign screening must not escalate to the senior model."
);

const finalReviewStart = route.indexOf(
  "async function selectCampaignCarouselProductsWithSeniorFinalReview"
);
const rescueStart = route.indexOf(
  "function buildCampaignCurationRescueRule",
  finalReviewStart
);
const finalReviewBlock = route.slice(finalReviewStart, rescueStart);
assert.match(
  finalReviewBlock,
  /\{ timeout: CAMPAIGN_FINAL_REVIEW_TIMEOUT_MS, maxRetries: 0 \}/
);
assert.match(
  finalReviewBlock,
  /This is the final bounded senior-model call/
);

const staleStart = route.indexOf("async function finalizeStaleAutomationOccurrences");
const staleEnd = route.indexOf(
  "async function stopRuleAfterCostProtectedCarouselFailure",
  staleStart
);
const staleBlock = route.slice(staleStart, staleEnd);
assert.match(staleBlock, /run_log_id/);
assert.match(staleBlock, /finishAutomationRunLog\(\{/);
assert.match(staleBlock, /automatic_retry_scheduled: false/);
assert.match(staleBlock, /terminal_failure: true/);

console.log("v142.8 theme-first bounded campaign tests passed.");
