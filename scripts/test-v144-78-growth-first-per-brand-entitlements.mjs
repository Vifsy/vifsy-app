import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`v144.78 failed: ${message}`); };

const billing = read("components/StripeBillingPanel.jsx");
const entitlements = read("lib/planEntitlements.js");
const stripeBilling = read("lib/stripeBilling.js");
const modal = read("components/PlanLimitModal.jsx");
const labels = read("lib/i18n/defaultLabels.js");
const sql = read("supabase/v144_78_growth_first_per_brand_entitlements.sql");
const rootSql = read("spreelo-v144.78-SQL.sql");
assert(rootSql === sql, "Root SQL handoff file is not identical to the Supabase migration");

// Pricing / capacity model.
assert(/starter:[\s\S]*brands: 1,[\s\S]*socialAccounts: 1,[\s\S]*recurringPlans: 1/.test(entitlements), "Starter entitlement model is wrong");
assert(/growth:[\s\S]*brands: 2,[\s\S]*socialAccounts: 5,[\s\S]*recurringPlans: 3/.test(entitlements), "Growth entitlement model is wrong");
assert(/pro:[\s\S]*brands: 5,[\s\S]*socialAccounts: null,[\s\S]*recurringPlans: 8/.test(entitlements), "Pro entitlement model is wrong");
assert(/key: "growth", name: "Growth", credits: 450[\s\S]*brands: 2, socialAccounts: 5, recurringPlans: 3/.test(billing), "Growth pricing card is out of sync");
assert(/key: "pro", name: "Pro", credits: 1000[\s\S]*brands: 5, socialAccounts: null, recurringPlans: 8/.test(billing), "Pro pricing card is out of sync");
assert(/growth:[\s\S]*credits: 450/.test(stripeBilling), "Growth Stripe allowance is not 450");
assert(/pro:[\s\S]*credits: 1000/.test(stripeBilling), "Pro Stripe allowance is not 1000");

// Clean UI copy: one shared per-brand note, not “/brand” repeated per row.
assert(billing.includes('billing.socialAccountsUnlimited'), "Unlimited Pro social-channel label is missing");
assert(billing.includes('stripe-reference-per-brand-note'), "Shared per-brand note is missing");
assert(labels.includes('"billing.perBrandLimitsNote"'), "Per-brand source label is missing");
assert(labels.includes('"billing.socialAccountsUnlimited"'), "Unlimited social-channel source label is missing");
assert(modal.includes('details.recommendedUnlimited'), "Plan-limit modal cannot explain unlimited Pro social capacity");

// Social checks must count the selected brand, not the whole account.
assert(entitlements.includes('loadPlanUsage(db, userId, { brandProfileId })'), "Brand-scoped usage is not wired into social capacity checks");
assert(entitlements.includes('.eq("brand_profile_id", brandProfileId)'), "Brand-scoped database query is missing in entitlement helper");

// Database hard limits must also be per brand.
assert(sql.includes("when 'growth' then 2") && sql.includes("when 'pro' then 5"), "Brand limits are wrong in SQL");
assert(sql.includes("when 'growth' then 5") && sql.includes("when 'pro' then 2147483647"), "Social limits are wrong in SQL");
assert(sql.includes("when 'growth' then 3") && sql.includes("when 'pro' then 8"), "Rolling-plan limits are wrong in SQL");
assert((sql.match(/brand_profile_id is not distinct from new\.brand_profile_id/g) || []).length >= 3, "Per-brand trigger scoping is incomplete");
assert(sql.includes('public.spreelo_is_plan_limit_admin(new.user_id)'), "Admin bypass was not preserved");
assert(sql.includes("lower(coalesce(r.queue_source, 'content_studio')) <> 'campaign'"), "Campaign plans are no longer excluded");

// Existing balances are never capped or reduced by this migration.
const creditUpdate = sql.slice(sql.indexOf('update public.user_credit_balances'));
assert(creditUpdate.includes('monthly_credit_limit'), "Existing monthly allowance migration is missing");
assert(!/set[\s\S]{0,500}credits_remaining\s*=/.test(creditUpdate), "Migration must not rewrite/cap credits_remaining");

// Existing approved billing behavior stays intact.
assert(billing.includes('const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup'), "Billing interval lookup changed");
assert(billing.includes('changeSubscription(lookup, isImmediatePaidChange)'), "Subscription change handler changed");
assert(billing.includes('startCheckout(pack.lookup, false)'), "Extra-credit checkout handler changed");
assert(billing.includes('toggleCancellation(cancelScheduled)'), "Cancellation handler changed");

console.log("v144.78 Growth-first package and per-brand entitlement checks passed");
