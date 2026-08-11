import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

const settings = read("app/settings/page.jsx");
const billing = read("components/StripeBillingPanel.jsx");
const automation = read("app/automation/page.jsx");
const css = read("app/styles/40-v143-79-settings-studio.css");
const globals = read("app/globals.css");
const defaults = read("lib/i18n/defaultLabels.js");
const sv = read("lib/i18n/builtInLocaleLabels.js");
const cache = read("lib/i18n/useUiText.js");

assert.ok(settings.includes("settings-v14379-overview"), "settings should use approved two-part overview");
assert.ok(settings.includes("settings-v14379-quick-grid"), "settings should use compact quick-settings cards");
assert.ok(settings.includes("settings.planSubscriptionTitle"), "settings should combine plan/subscription summary");
assert.ok(settings.includes("settings.notificationsTitle"), "settings should keep email notifications as a dedicated card");
assert.ok(billing.includes("stripe-billing-main-grid"), "billing should use premium plan + side rail layout");
assert.ok(billing.includes("billing.featureGrowthFormats"), "plan cards should have richer differentiated content");
assert.ok(billing.includes("stripe-credit-explainer"), "billing should explain credits clearly");
assert.ok(automation.includes("spreelo-ai-studio-hero-desktop-v14379.png"), "desktop AI studio should use the new hero art");
assert.ok(automation.includes("spreelo-ai-studio-hero-mobile-v14379.png"), "mobile AI studio should use the new hero art");
assert.ok(css.includes("grid-template-columns: minmax(0,.92fr) minmax(580px,1.08fr)"), "desktop settings hero must not become a full-width long hero");
assert.ok(css.includes("width:calc(100% - 12px)"), "AI studio mobile should use more of the available width");
assert.ok(css.includes("font-size:10.6px"), "oversized platform-adapter copy should be controlled on mobile");
assert.ok(globals.includes('40-v143-79-settings-studio.css'), "v143.79 CSS must load last");
assert.ok(defaults.includes('"billing.howCreditsWorkTitle"'), "English source labels should contain new design copy");
assert.ok(sv.includes('"billing.howCreditsWorkTitle"'), "Swedish built-in labels should contain the new design copy");
assert.ok(cache.includes('TRANSLATION_CACHE_VERSION = "v19"'), "translation cache must be refreshed");
for (const rel of [
  "public/backgrounds/spreelo-ai-studio-hero-desktop-v14379.png",
  "public/backgrounds/spreelo-ai-studio-hero-mobile-v14379.png",
  "public/backgrounds/spreelo-settings-hero-desktop-v14379.png",
  "public/backgrounds/spreelo-settings-hero-mobile-v14379.png",
]) assert.ok(exists(rel), `${rel} must exist`);

console.log("v143.79 settings + AI studio redesign checks passed");
