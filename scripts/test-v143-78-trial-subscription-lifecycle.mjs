import fs from "node:fs";
import assert from "node:assert/strict";

function read(path) { return fs.readFileSync(path, "utf8"); }

const stripe = read("lib/stripeBilling.js");
const checkout = read("app/api/stripe/checkout/route.js");
const status = read("app/api/stripe/status/route.js");
const webhook = read("app/api/stripe/webhook/route.js");
const change = read("app/api/stripe/subscription/change/route.js");
const cancel = read("app/api/stripe/subscription/cancel/route.js");
const deleteAccount = read("app/api/delete-account/route.js");
const billing = read("components/StripeBillingPanel.jsx");
const automation = read("app/automation/page.jsx");
const dashboard = read("app/page.jsx");
const sql = read("supabase/v143_78_trial_subscription_lifecycle.sql");
const labels = read("lib/i18n/defaultLabels.js");
const sv = read("lib/i18n/builtInLocaleLabels.js");
const cache = read("lib/i18n/useUiText.js");

assert.ok(stripe.includes("SPREELO_TRIAL_DAYS = 14"), "14-day trial constant missing");
assert.ok(stripe.includes("SPREELO_TRIAL_CREDITS = 100"), "100 trial-credit constant missing");
assert.ok(stripe.includes("getRegistrableBusinessDomain"), "business-domain trial identity missing");
assert.ok(stripe.includes("SHARED_HOST_ROOTS"), "hosted-store domain protection missing");
assert.ok(stripe.includes('reason: "account_trial_pending"'), "parallel trial reservation protection missing");

assert.ok(checkout.includes("subscription_data[trial_period_days]"), "Checkout trial period missing");
assert.ok(checkout.includes("claim_spreelo_trial_business"), "trial reservation RPC missing");
assert.ok(checkout.includes("spreelo_trial_domain"), "trial business identity metadata missing");
assert.ok(checkout.includes('topUpStatuses = new Set(["active", "trialing"])'), "credit packs must require active/trial subscription");

assert.ok(status.includes("getTrialEligibility"), "billing status must expose trial eligibility");
assert.ok(status.includes("pending_subscription_effective_at"), "pending plan change status missing");

assert.ok(webhook.includes('event.type === "customer.subscription.trial_will_end"'), "trial-ending webhook missing");
assert.ok(webhook.includes("sendTrialEndingReminder"), "trial-ending reminder missing");
assert.ok(webhook.includes("balanceExists") && webhook.includes("deleted-account trial claim"), "deleted-account webhook acknowledgement missing");
assert.ok(webhook.includes("finalize_stripe_plan_change"), "paid plan-change credit finalization missing");
assert.ok(webhook.includes('String(subscription?.status || "").toLowerCase() !== "trialing"'), "trial must not get paid allowance early");

assert.ok(cancel.includes("cancel_at_period_end"), "end-of-period cancellation missing");
assert.ok(cancel.includes("resume"), "cancellation reversal missing");

assert.ok(change.includes('proration_behavior: "always_invoice"'), "upgrade proration missing");
assert.ok(change.includes('payment_behavior: "pending_if_incomplete"'), "safe paid upgrade missing");
assert.ok(change.includes("subscription_schedules"), "end-of-period downgrade schedule missing");
assert.ok(change.includes('credit_mode: "delta"') || change.includes('creditMode = sameInterval ? "delta"'), "prorated upgrade credits missing");

assert.ok(deleteAccount.includes("stripeRequest"), "account deletion must cancel Stripe");
assert.ok(deleteAccount.includes("providerSubscriptionId"), "account deletion subscription lookup missing");

assert.ok(sql.includes("initialize_new_credit_balance_free_v14378"), "new accounts must start Free with zero credits");
assert.ok(sql.includes("new.credits_remaining := 0") && sql.includes("new.plan_name := 'Free'"), "new account Free defaults missing");
assert.ok(sql.includes("trial_business_claims"), "durable business trial claims table missing");
assert.ok(sql.includes("domain_key text not null unique"), "one trial per business domain missing");
assert.ok(sql.includes("trial_business_claims_user_unique_idx"), "one trial reservation per account missing");
assert.ok(sql.includes("interval '2 hours'"), "pending trial reservation expiry missing");
assert.ok(sql.includes("apply_stripe_subscription_state_v14378"), "trial/free subscription state function missing");
assert.ok(sql.includes("plan_name = 'Free'"), "Free fallback missing");
assert.ok(sql.includes("purchased_credits_remaining = v_purchased"), "purchased credit preservation missing");
assert.ok(sql.includes("Recurring schedule paused because the paid subscription ended"), "reserved recurring credits must be released at Free transition");
assert.ok(sql.includes("enforce_paid_recurring_schedule_v14378"), "DB recurring-plan guard missing");
assert.ok(sql.includes("schedule_type = 'weekly'"), "weekly automations must be paused on Free");
assert.ok(sql.includes("stripe_plan_changes"), "plan-change audit table missing");
assert.ok(sql.includes("subscription_status = 'active'") && sql.includes("Trialing subscriptions are deliberately excluded"), "annual trial credit refresh must wait for first payment");

assert.ok(billing.includes("billing.startTrial"), "trial CTA missing");
assert.ok(billing.includes("billing.cancelSubscription"), "subscription cancel control missing");
assert.ok(billing.includes("billing.pendingPlanTitle"), "pending plan UI missing");
assert.ok(billing.includes("billing.trialWebsiteTitle"), "trial website requirement UI missing");
assert.ok(automation.includes("automation.recurringRequiresPaidPlan"), "Free recurring schedule save guard missing");
assert.ok(dashboard.includes("dashboard.recurringRequiresPaidPlan"), "Free recurring schedule resume guard missing");

for (const key of [
  '"billing.trialOfferTitle"', '"billing.trialWebsiteTitle"', '"billing.cancellationScheduledTitle"',
  '"automation.recurringRequiresPaidPlan"', '"dashboard.recurringRequiresPaidPlan"',
]) {
  assert.ok(labels.includes(key), `English label missing ${key}`);
  assert.ok(sv.includes(key), `Swedish built-in label missing ${key}`);
}
assert.ok(cache.includes('TRANSLATION_CACHE_VERSION = "v19"'), "translation cache version must be v19");

console.log("v143.78 trial/subscription lifecycle regression checks passed.");
