import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/78-v144-80-studio-reference-final.css", "utf8");
const billing = fs.readFileSync("components/StripeBillingPanel.jsx", "utf8");
const cancelRoute = fs.readFileSync("app/api/stripe/subscription/change/cancel/route.js", "utf8");
const labels = fs.readFileSync("lib/i18n/defaultLabels.js", "utf8");

assert.ok(globals.trimEnd().endsWith('@import "./styles/78-v144-80-studio-reference-final.css";'), "v144.80 must load last");

// Sidebar underlay is global on desktop, not settings-only.
assert.match(css, /\.app-shell\.spreelo-shell[\s\S]*276px 100% no-repeat/);
assert.doesNotMatch(css, /:has\(\.settings-reference-page\)/);

// Mobile settings reference: larger typography + value pills + six-row flattening.
assert.match(css, /plan-v14467-settings-group,[\s\S]*plan-v14467-settings-rows[\s\S]*display: contents !important/);
assert.match(css, /plan-v90-setting-title[\s\S]*font-size: 14px !important/);
assert.match(css, /plan-v90-setting-copy small[\s\S]*font-size: 10\.5px !important/);
assert.match(css, /plan-v14473-mobile-value[\s\S]*min-height: 40px !important[\s\S]*background: #f8f6ff !important/);
assert.match(css, /plan-v14467-week-rhythm[\s\S]*grid-template-columns: minmax\(0, 1fr\) !important/);
assert.match(css, /plan-v14457-week-day > span[\s\S]*font-size: 11\.5px !important/);
assert.match(css, /plan-v14457-week-day > strong[\s\S]*font-size: 9\.5px !important/);

// Planned cards use the supplied left-rail / date / title / destination structure.
assert.match(css, /plan-v70-planned-row[\s\S]*grid-template-columns: 102px minmax\(0, 1fr\)[\s\S]*"visual date"[\s\S]*"visual post"[\s\S]*"visual channel"/);
assert.match(css, /plan-v70-planned-channel[\s\S]*border-top: 1px solid #e4e8ef/);
assert.match(css, /plan-v100-planned-title-line > strong[\s\S]*font-size: 20px !important/);
assert.match(css, /plan-v86-planned-visual\.tone-2|Colored rail remains varied/);

// Footer layout must adapt to available width and never crush the activation copy.
assert.match(css, /repeat\(auto-fit, minmax\(440px, 1fr\)\)/);
assert.match(css, /plan-v70-activate-copy[\s\S]*grid-column: 2 !important/);
assert.match(css, /plan-v70-activate-actions[\s\S]*grid-column: 1 \/ -1 !important/);

// Scheduled downgrades can be canceled safely through Stripe schedule release.
assert.match(billing, /cancelScheduledPlanChange/);
assert.match(billing, /\/api\/stripe\/subscription\/change\/cancel/);
assert.match(billing, /billing\.cancelScheduledPlanChange/);
assert.match(billing, /hasPendingPlanChange && !selected/);
assert.match(cancelRoute, /subscription_schedules\/\$\{encodeURIComponent\(scheduleId\)\}\/release/);
assert.match(cancelRoute, /pending_subscription_plan: null/);
assert.match(cancelRoute, /provider_subscription_schedule_id: null/);
assert.match(cancelRoute, /status: "canceled"/);
assert.match(labels, /billing\.cancelScheduledPlanChange/);
assert.match(labels, /billing\.scheduledPlanChangeCanceled/);

// Package values and uncapped-credit behavior remain untouched.
assert.match(billing, /credits: 150/);
assert.match(billing, /credits: 450/);
assert.match(billing, /credits: 1000/);
assert.match(billing, /brands: 2, socialAccounts: 5, recurringPlans: 3/);
assert.match(billing, /brands: 5, socialAccounts: null, recurringPlans: 8/);

console.log("v144.80 studio reference + billing undo checks passed");
