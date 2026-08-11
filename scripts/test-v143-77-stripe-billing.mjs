import fs from "node:fs";
import assert from "node:assert/strict";

function read(path) { return fs.readFileSync(path, "utf8"); }

const stripe = read("lib/stripeBilling.js");
const checkout = read("app/api/stripe/checkout/route.js");
const webhook = read("app/api/stripe/webhook/route.js");
const status = read("app/api/stripe/status/route.js");
const annualCron = read("app/api/cron/refresh-annual-plan-credits/route.js");
const settings = read("app/settings/page.jsx");
const billing = read("components/StripeBillingPanel.jsx");
const sql = read("supabase/v143_77_stripe_billing.sql");
const vercel = JSON.parse(read("vercel.json"));
const labels = read("lib/i18n/defaultLabels.js");
const sv = read("lib/i18n/builtInLocaleLabels.js");

for (const key of [
  "spreelo_starter_monthly", "spreelo_starter_yearly",
  "spreelo_growth_monthly", "spreelo_growth_yearly",
  "spreelo_pro_monthly", "spreelo_pro_yearly",
  "spreelo_credits_100", "spreelo_credits_250", "spreelo_credits_500",
]) assert.ok(stripe.includes(key), `missing Stripe lookup key ${key}`);

assert.ok(checkout.includes('managed_payments[enabled]'), "Managed Payments must be enabled at Checkout");
assert.ok(checkout.includes('mode: lookup.kind === "subscription" ? "subscription" : "payment"'), "Checkout must support subscriptions and one-time credit purchases");
assert.ok(webhook.includes("verifyStripeWebhookSignature"), "Webhook signature verification missing");
assert.ok(webhook.includes('event.type === "invoice.paid"'), "invoice.paid handler missing");
assert.ok(webhook.includes('checkout.session.async_payment_succeeded'), "async payment success handler missing");
assert.ok(webhook.includes('primaryItem.current_period_start') && webhook.includes('primaryItem.current_period_end'), "subscription periods must come from subscription items on Basil+");
assert.ok(webhook.includes('subscription_create') && webhook.includes('subscription_cycle') && webhook.includes('allowanceReasons'), "invoice allowance grants must ignore proration/update invoices");
assert.ok(checkout.includes('Extra credits require an active Spreelo subscription.'), "credit-pack checkout must require an active subscription");
assert.ok(status.includes("purchased_credits_remaining"), "Billing status must expose purchased credit pool");
assert.ok(sql.includes("stripe_webhook_events"), "Webhook idempotency table missing");
assert.ok(sql.includes("grant_stripe_purchased_credits"), "Purchased credit grant function missing");
assert.ok(sql.includes("refresh_due_annual_subscription_credits"), "Annual monthly credit refresh function missing");
assert.ok(annualCron.includes("refresh_due_annual_subscription_credits"), "Annual refresh cron not connected");
assert.ok(vercel.crons.some((item) => item.path === "/api/cron/refresh-annual-plan-credits"), "Annual credit refresh cron missing in vercel.json");
assert.ok(settings.includes("StripeBillingPanel"), "Settings page must include billing UI");
assert.ok(billing.includes("One-time") || billing.includes("extraCredits"), "Extra credit UI missing");
assert.ok(labels.includes('"billing.title"'), "English billing labels missing");
assert.ok(sv.includes('"billing.title"'), "Swedish built-in billing labels missing");
assert.ok(read("lib/i18n/useUiText.js").includes('TRANSLATION_CACHE_VERSION = "v19"'), "translation cache version must be v19");

console.log("v143.77 Stripe billing regression checks passed.");
