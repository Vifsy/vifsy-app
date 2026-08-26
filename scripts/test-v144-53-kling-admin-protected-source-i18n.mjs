import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const cron = read("app/api/cron/run-automations/route.js");
const finalizer = read("app/api/cron/finalize-kling-videos/route.js");
const adminPage = read("app/admin/post-approvals/page.jsx");
const adminApi = read("app/api/admin/post-approvals/route.js");
const retryApi = read("app/api/admin/post-approvals/retry-kling/route.js");
const translations = read("app/api/ui-translations/route.js");
const labels = read("lib/i18n/defaultLabels.js");
const analysisRoute = read("app/api/analyze-brand/route.js");
const analysisEngine = read("app/api/analyze-brand/brandAnalysisEngine.js");
const storeMap = read("lib/storeMapProductAgent.js");
const css = read("app/styles/38-current-experience-v143.css");

// Kling should be constrained before the paid provider call.
assert.match(cron, /COMPONENT ROLE LOCK:[\s\S]{0,900}same purpose, attachment, geometry and mechanical state/);
assert.match(cron, /SURFACE PRINT LOCK:[\s\S]{0,700}character-for-character/);
assert.match(cron, /visible logos, emblems, letters, numbers, label graphics and packaging print as character-for-character locked/);
assert.match(cron, /if exact preservation conflicts with motion, reduce product motion and move the camera\/environment instead/);

// Finished-video audit stays as a delivery gate and exposes structured violations.
assert.match(finalizer, /violation_codes:\s*violationCodes/);
assert.match(finalizer, /KLING_FINISHED_PRODUCT_IDENTITY_REJECTED/);
assert.match(finalizer, /Every boolean must agree with the written reason/);
assert.match(finalizer, /summary\.product_identity_rejected \+= 1/);

// Admin must show the rejected state and one-click Kling-only retry.
assert.match(adminPage, /function getKlingRejectedAudit/);
assert.match(adminPage, /admin\.approvals\.klingRejectedTitle/);
assert.match(adminPage, /retryRejectedKlingVideo/);
assert.match(adminPage, /admin\.approvals\.klingRetry/);
assert.match(adminApi, /video_background_selection, kling_prompt, kling_reference_image_url, kling_task_id/);
assert.match(retryApi, /Only a Kling video rejected by the finished-video product identity audit can be retried here/);
assert.match(retryApi, /submitKlingImageToVideo\(\{/);
assert.match(retryApi, /imageUrl: referenceImageUrl/);
assert.match(retryApi, /prompt: retryPrompt/);
assert.doesNotMatch(retryApi, /findWebsiteProduct|discoverProduct|gpt-image|images\.generate|OpenAI/);
assert.match(retryApi, /content_type_id: post\.content_type_id/);
assert.match(labels, /"admin\.approvals\.klingRejectedTitle": "Video rejected"/);
assert.match(css, /\.admin-kling-rejection-summary/);

// UI translation: smaller chunks, realistic timeout, and successful chunks persisted immediately.
assert.match(translations, /export const maxDuration = 60/);
assert.match(translations, /TRANSLATION_CHUNK_SIZE = 32/);
assert.match(translations, /TRANSLATION_CONCURRENCY = 2/);
assert.match(translations, /TRANSLATION_FETCH_TIMEOUT_MS = 24000/);
assert.match(translations, /onChunkTranslated: persistSuccessfulChunk/);
assert.match(translations, /status: "updating"/);
assert.match(translations, /delete progressiveDeferredKeys\[String\(key\)\]/);
assert.match(translations, /await progressWriteChain/);

// Brand analysis classifies the product source without requiring direct checkout for manufacturers.
for (const source of [analysisRoute, analysisEngine]) {
  assert.match(source, /website_product_mode\.source_type/);
  assert.match(source, /manufacturer_catalog/);
  assert.match(source, /fully eligible.*without direct checkout|fully eligible.*no add-to-cart/is);
  assert.match(source, /\[source_type=\$\{sourceType\}\]/);
}

// Runtime separates product-source rules and knows a current manufacturer catalog is enough.
assert.match(cron, /function isManufacturerCatalogSource/);
assert.match(cron, /catalog_current/);
assert.match(cron, /isProductEligibleForWebsiteSource/);
assert.match(cron, /Protected manufacturer catalog kept current official-product verification/);
assert.match(cron, /Protected manufacturer carousel catalog kept current official products/);

// Once the domain is known protected, all direct crawler entry points return before fetching.
assert.match(cron, /Focused category direct crawl skipped for known protected website/);
assert.match(cron, /Direct store-search discovery skipped for known protected website/);
assert.match(cron, /Direct website product discovery skipped for known protected website/);
assert.match(cron, /Protected website direct discovery skipped after security state was established/);
assert.match(cron, /PROTECTED_PRODUCT_RESEARCH_MAX_RETRIES = 1/);
assert.match(cron, /PROTECTED_PRODUCT_RESEARCH_RETRY_DELAY_MS = 30 \* 60 \* 1000/);

// Single-product work should stop expanding once one strong product is locked.
assert.match(storeMap, /reserveCount: isCarouselScale \? Math\.max\(count, 5\) : 1/);
assert.match(storeMap, /minimumVerifiedProducts: isCarouselScale[\s\S]{0,120}: 1/);
assert.match(cron, /selectedAlreadyStronglyLocked/);
assert.match(cron, /skipped optional direct reserve discovery after strong primary product lock/);

console.log("v144.53 Kling/admin/protected-source/i18n regression checks passed");
