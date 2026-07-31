import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectWebsiteSecurityProvider } from "../lib/websiteSecurity.js";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

function testServerOwnedQueue() {
  const cron = read("app/api/cron/run-brand-analysis-jobs/route.js");
  const sql = read("supabase/v143_19_durable_brand_analysis.sql");
  const vercel = read("vercel.json");
  const runRoute = read("app/api/analyze-brand/run/route.js");

  assert.match(cron, /claim_brand_analysis_job/u);
  assert.match(cron, /WORKER_LEASE_SECONDS = 330/u);
  assert.match(cron, /MAX_ANALYSIS_ATTEMPTS = 5/u);
  assert.match(cron, /expectedLeaseToken: job\.lease_token/u);
  assert.match(cron, /analysis_unusually_long/u);
  assert.match(sql, /for update skip locked/iu);
  assert.match(sql, /lease_expires_at/iu);
  assert.match(sql, /claim_user_lifecycle_email/iu);
  assert.match(vercel, /\/api\/cron\/run-brand-analysis-jobs/u);
  assert.doesNotMatch(runRoute, /runBrandAnalysisJob/u);
}

function testOfficialDomainFallback() {
  const research = read("app/api/analyze-brand/webResearch.js");
  const engine = read("app/api/analyze-brand/brandAnalysisEngine.js");
  const security = read("lib/websiteSecurity.js");

  assert.match(research, /background: true/u);
  assert.match(research, /type: "web_search"/u);
  assert.match(research, /allowed_domains: \[allowedDomain\]/u);
  assert.match(research, /official domain only/iu);
  assert.match(engine, /web_research_evidence/u);
  assert.match(engine, /\[401, 403, 429\]/u);
  assert.match(engine, /detectWebsiteSecurityProvider/u);
  assert.match(security, /BLOCK_PAGE_TESTS/u);
  assert.match(security, /challenge-platform/u);

  assert.equal(
    detectWebsiteSecurityProvider({
      status: 200,
      headers: new Headers({ server: "cloudflare" }),
      body: "<html><title>Attention Required! | Cloudflare</title></html>",
    }).blocked,
    true
  );
  assert.equal(
    detectWebsiteSecurityProvider({
      status: 200,
      headers: new Headers({ server: "cloudflare", "cf-ray": "abc" }),
      body: "<html><main>Ordinary accessible product page</main></html>",
    }).blocked,
    false
  );
}

function testBrowserCanLeaveSafely() {
  for (const page of ["app/onboarding/page.jsx", "app/brand/page.jsx"]) {
    const source = read(page);
    assert.doesNotMatch(source, /fetch\("\/api\/analyze-brand\/run"/u);
    assert.match(source, /notificationLocale: locale/u);
    assert.match(source, /website_blocked_background_research/u);
    assert.match(source, /analysis_unusually_long/u);
    assert.match(source, /> 90_000/u);
  }
}

function testLifecycleEmails() {
  const email = read("lib/lifecycleEmails.js");
  const welcomeRoute = read("app/api/account/welcome-email/route.js");
  const login = read("app/login/page.jsx");
  const labels = read("lib/i18n/defaultLabels.js");
  const cron = read("app/api/cron/run-brand-analysis-jobs/route.js");

  assert.match(email, /claim_user_lifecycle_email/u);
  assert.match(email, /RESEND_API_KEY/u);
  assert.match(email, /getServerTranslations/u);
  assert.match(welcomeRoute, /emailType: "welcome"/u);
  assert.match(login, /\/api\/account\/welcome-email/u);
  assert.match(labels, /emails\.analysisCompleted\.subject/u);
  assert.match(labels, /emails\.welcome\.subject/u);
  assert.match(cron, /sendCompletionEmail/u);
  assert.match(cron, /retryOneCompletionEmail/u);
}

testServerOwnedQueue();
testOfficialDomainFallback();
testBrowserCanLeaveSafely();
testLifecycleEmails();

console.log("v143.19 durable brand analysis checks passed.");
