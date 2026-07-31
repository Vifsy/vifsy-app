import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
const hash = (relativePath) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(projectRoot, relativePath)))
    .digest("hex")
    .toUpperCase();

function testSmoothAnalysisProgress() {
  const onboarding = read("app/onboarding/page.jsx");

  assert.match(onboarding, /ANALYSIS_VISUAL_DURATION_MS = 5 \* 60 \* 1000/u);
  assert.match(onboarding, /window\.setInterval\(updateVisualProgress, 250\)/u);
  assert.match(onboarding, /elapsedMs \/ ANALYSIS_VISUAL_DURATION_MS/u);
  assert.match(onboarding, /ANALYSIS_VISUAL_MAX_PROGRESS/u);
  assert.match(onboarding, /setAnalysisProgress\(100\)/u);
  assert.match(onboarding, /window\.location\.href = `\/onboarding\/ready/u);
}

function testPolishedFirstRunUi() {
  const globals = read("app/globals.css");
  const css = read("app/styles/41-v143-18-onboarding-polish.css");
  const login = read("app/login/page.jsx");
  const onboarding = read("app/onboarding/page.jsx");
  const ready = read("app/onboarding/ready/page.jsx");

  assert.match(globals, /41-v143-18-onboarding-polish\.css/u);
  assert.match(login, /login-refresh-saas-preview/u);
  assert.match(onboarding, /onboarding-refresh-saas-preview/u);
  assert.match(css, /workspace-loader-page/u);
  assert.match(css, /onboarding-ready-hero-status/u);
  assert.match(css, /onboarding-ready-hero-copy h1 > span/u);
  assert.match(css, /onboarding-ready-platforms img[\s\S]*background: transparent/u);
  assert.match(ready, /onboarding-ready-hero-status/u);
  assert.match(ready, /<span>\{brandName\}<\/span>/u);
  assert.doesNotMatch(ready, /brandName\.slice\(0, 1\)/u);
  assert.match(ready, /\/social-icons\/threads\.svg/u);
}

function testClosedCalendarAndQuietAdminProbe() {
  const calendar = read("app/calendar/page.jsx");
  const adminMe = read("app/api/admin/me/route.js");

  assert.match(calendar, /setSelectedCampaignId\(""\)/u);
  assert.match(calendar, /if \(!selectedCampaignId\) \{\s*return null;/u);
  assert.doesNotMatch(calendar, /visibleCampaigns\[0\]/u);
  assert.match(adminMe, /context\.status === 403 && context\.user/u);
  assert.match(adminMe, /isAdmin: false/u);
  assert.match(adminMe, /canManage: false/u);
}

function testCoreEnginesRemainFrozen() {
  assert.equal(
    hash("app/api/analyze-brand/brandAnalysisEngine.js"),
    "6A432451734CF59C084883CB407AD014796B56AF8C65873491AAFB52BE552283"
  );
  assert.equal(
    hash("app/api/analyze-brand/run/route.js"),
    "BE6BF1049F1AFBB26A04625763BC118A6A6856D4A1B698882993A253147065CC"
  );
  assert.equal(
    hash("app/api/cron/run-automations/route.js"),
    "71FAF5F77FABF4A4CF143AB0BA1BB13C034EDA910B7E43652047F52141B0353E"
  );
}

testSmoothAnalysisProgress();
testPolishedFirstRunUi();
testClosedCalendarAndQuietAdminProbe();
testCoreEnginesRemainFrozen();

console.log("v143.18 onboarding polish checks passed.");
