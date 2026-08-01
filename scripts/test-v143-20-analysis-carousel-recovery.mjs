import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

function extractFunction(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  assert.ok(start >= 0 && end > start, `Could not extract ${name}`);
  return source.slice(start, end);
}

function testIncompleteResearchRecovery() {
  const research = read("app/api/analyze-brand/webResearch.js");
  const worker = read("app/api/cron/run-brand-analysis-jobs/route.js");
  const helpers = read("app/api/analyze-brand/jobHelpers.js");

  assert.match(research, /isWebResearchIncomplete/u);
  assert.match(research, /incompleteDetails: response\?\.incomplete_details \|\| null/u);
  assert.doesNotMatch(
    research.match(/isWebResearchTerminalFailure[\s\S]*?\n\}/u)?.[0] || "",
    /incomplete/u,
    "An incomplete response is recoverable evidence, not an immediate terminal error"
  );
  assert.match(
    research,
    /max_output_tokens: compactRetry\s*\? RETRY_WEB_RESEARCH_OUTPUT_TOKENS/u
  );
  assert.match(worker, /MAX_WEB_RESEARCH_RECOVERY_SUBMISSIONS = 2/u);
  assert.match(worker, /hasUsableWebResearchEvidence/u);
  assert.match(worker, /Recovered partial web research/u);
  assert.match(worker, /compact recovery submitted/u);
  assert.match(worker, /attemptCount: currentSubmissionCount \+ 1/u);
  assert.match(helpers, /updatePayload\.attempt_count/u);

  const processJob = extractFunction(worker, "processClaimedJob", "GET");
  const tryIndex = processJob.indexOf("try {");
  const resumeIndex = processJob.indexOf("resumeWebResearch");
  assert.ok(
    tryIndex >= 0 && resumeIndex > tryIndex,
    "Retrieving a background response must be inside the durable retry boundary"
  );
}

function testSelectedProductTechnicalRecovery() {
  const route = read("app/api/cron/run-automations/route.js");
  const recovery = extractFunction(
    route,
    "discoverPrimaryWebResearchTechnicalRecoveryCandidates",
    "mergePrimaryWebResearchTechnicalRecovery"
  );
  const merger = extractFunction(
    route,
    "mergePrimaryWebResearchTechnicalRecovery",
    "hydrateAuthoritativeWebAgentProduct"
  );
  const primary = extractFunction(
    route,
    "findPrimaryCampaignProductsWithWebSearch",
    "finalizeCarouselFromPrimaryCampaignWebResearch"
  );

  assert.match(recovery, /extractSearchFormUrlsFromHtml/u);
  assert.match(recovery, /buildStoreSearchUrls/u);
  assert.match(recovery, /extractProductCardCandidatesFromHtml/u);
  assert.match(recovery, /findMatchingPrimaryWebResearchCandidate/u);
  assert.match(recovery, /renderHtml/u);
  assert.match(merger, /haveProductTitlesIdentityAgreement/u);
  assert.match(merger, /technical_identity_recovered: true/u);
  assert.match(primary, /failedHydrationCandidates/u);
  assert.match(
    primary,
    /discoverPrimaryWebResearchTechnicalRecoveryCandidates/u
  );
  assert.match(primary, /editorialSelectionChanged: false/u);
  assert.doesNotMatch(
    primary,
    /verifyDiscoveredWebsiteProductCandidates|applyAiCampaignFitScores|selectCampaignCarouselProductsWithSeniorFinalReview/u,
    "Technical recovery may not re-score or replace GPT-5.5's editorial choices"
  );
  assert.match(
    route,
    /const renderedSearchResult = await renderedSearchBrowserSession\.renderHtml/u
  );
  assert.match(route, /html = renderedSearchResult\.html/u);
}

testIncompleteResearchRecovery();
testSelectedProductTechnicalRecovery();

console.log("v143.20 analysis and carousel recovery checks passed.");
