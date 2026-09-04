import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const brandPage = read("app/brand/page.jsx");
const appLayout = read("components/AppLayout.jsx");
const engine = read("app/api/analyze-brand/brandAnalysisEngine.js");
const worker = read("app/api/cron/run-brand-analysis-jobs/route.js");
const labels = read("lib/i18n/defaultLabels.js");
const globals = read("app/globals.css");

// 1. Closing the fixed edit dialog must not reload and reopen it.
assert.doesNotMatch(
  brandPage,
  /onClick=\{\(\) => window\.location\.reload\(\)\}/u,
  "Brand edit Close must not reload the page"
);
assert.match(brandPage, /setIsEditing\(false\)/u);
assert.match(brandPage, /showAnalysisFailureState/u);
assert.match(brandPage, /brand-analysis-failed-state/u);
assert.match(labels, /brand\.analysisFailedTitle/u);

// 2. A timer abort is converted into an explicit recoverable timeout.
assert.match(engine, /WebsiteFetchTimeoutError/u);
assert.match(engine, /WEBSITE_FETCH_TIMEOUT/u);
assert.match(engine, /controller\.signal\.aborted/u);

// 3. Timeout uses the existing official-domain web-research recovery path.
assert.match(worker, /isDirectWebsiteFallbackError/u);
assert.match(worker, /WEBSITE_SECURITY_BLOCKED", "WEBSITE_FETCH_TIMEOUT/u);
assert.match(worker, /website_timeout_fallback/u);
assert.match(worker, /submitWebResearchAndRelease/u);
assert.match(worker, /direct_fetch_timeout/u);

// 4. Numbered www hosts may never become the company name.
assert.match(appLayout, /replace\(\/\^www\\d\*\\\.\/i, ""\)/u);
assert.doesNotMatch(appLayout, /replace\(\/\^www\\\.\/i, ""\);\n\s*const label/u);

// v144.105 style layer is loaded last.
assert.match(globals, /99-v144-105-brand-analysis-recovery\.css/u);

console.log("v144.105 brand analysis recovery checks passed.");
