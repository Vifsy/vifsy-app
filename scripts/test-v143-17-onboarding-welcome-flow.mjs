import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(currentFile), "..");
const readProjectFile = (relativePath) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

function testAccountEntryFlow() {
  const login = readProjectFile("app/login/page.jsx");
  const labels = readProjectFile("lib/i18n/defaultLabels.js");

  assert.match(login, /emailRedirectTo,/u);
  assert.match(login, /app_locale: locale/u);
  assert.doesNotMatch(login, /login-refresh-progress/u);
  assert.match(labels, /Sign in or create your account/u);
  assert.match(labels, /your account will be created automatically/u);
}

function testRealAnalysisProgressAndCompletionRoute() {
  const onboarding = readProjectFile("app/onboarding/page.jsx");

  assert.doesNotMatch(onboarding, /ANALYSIS_DISPLAY_DURATION_MS/u);
  assert.doesNotMatch(onboarding, /getSmoothAnalysisProgress/u);
  assert.doesNotMatch(onboarding, /onboarding-refresh-stepper/u);
  assert.match(onboarding, /onStatus: \(job\)/u);
  assert.match(onboarding, /setAnalysisProgress\(Math\.max/u);
  assert.match(onboarding, /\/onboarding\/ready\?brandId=/u);
}

function testWelcomeResultPage() {
  const ready = readProjectFile("app/onboarding/ready/page.jsx");

  assert.match(ready, /brand_campaign_opportunities/u);
  assert.match(ready, /onboarding-ready-analysis-card/u);
  assert.match(ready, /onboarding-ready-campaign-card/u);
  assert.match(ready, /launchPlatforms/u);
  for (const platform of [
    "Facebook",
    "Instagram",
    "LinkedIn",
    "TikTok",
    "YouTube",
    "X",
    "Threads",
    "Pinterest",
  ]) {
    assert.ok(ready.includes(platform), `welcome page should show ${platform}`);
  }
  assert.match(ready, /href="\/social-channels"/u);
  assert.match(ready, /href="\/calendar"/u);
  assert.match(ready, /href="\/brand"/u);
}

function testLocalizedStudioTheme() {
  const globals = readProjectFile("app/globals.css");
  const theme = readProjectFile(
    "app/styles/40-v143-17-onboarding-welcome-flow.css"
  );
  const swedishLabels = readProjectFile("lib/i18n/builtInLocaleLabels.js");
  const uiText = readProjectFile("lib/i18n/useUiText.js");

  assert.match(globals, /40-v143-17-onboarding-welcome-flow\.css/u);
  assert.match(uiText, /getBuiltInLocaleLabel/u);
  assert.match(uiText, /document\.documentElement\.lang/u);
  assert.match(swedishLabels, /Logga in eller skapa ditt konto/u);
  assert.match(swedishLabels, /Din arbetsyta är klar/u);

  for (const selector of [
    ".login-refresh-page",
    ".onboarding-refresh-page",
    ".onboarding-ready-page",
    ".onboarding-ready-hero",
    ".onboarding-ready-main-grid",
    ".onboarding-ready-platforms",
  ]) {
    assert.ok(theme.includes(selector), `studio theme must cover ${selector}`);
  }

  assert.match(theme, /@media \(max-width: 820px\)/u);
  assert.match(theme, /@media \(max-width: 560px\)/u);
}

function testOptionalLocalizedAuthEmail() {
  const hook = readProjectFile("supabase/functions/send-auth-email/index.ts");

  assert.match(hook, /new Webhook/u);
  assert.match(hook, /SEND_EMAIL_HOOK_SECRET/u);
  assert.match(hook, /RESEND_API_KEY/u);
  assert.match(hook, /redirect\.searchParams\.get\("lang"\)/u);
  assert.match(hook, /app_locale/u);
  assert.match(hook, /https:\/\/api\.resend\.com\/emails/u);

  for (const locale of [
    "en", "es", "pt", "fr", "de", "it", "nl", "sv", "da", "no",
    "fi", "pl", "tr", "ar", "hi", "id", "ja", "ko", "zh", "th",
    "uk", "ru", "bg", "vi", "cs", "ro", "hu", "el", "ms", "fil",
  ]) {
    assert.match(hook, new RegExp(`\\n  ${locale}: \\{`, "u"));
  }
}

testAccountEntryFlow();
testRealAnalysisProgressAndCompletionRoute();
testWelcomeResultPage();
testLocalizedStudioTheme();
testOptionalLocalizedAuthEmail();

console.log("v143.17 onboarding and welcome flow checks passed.");
