import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const billing = read("components/StripeBillingPanel.jsx");
assert(/key: "starter"[\s\S]*brands: 1, socialAccounts: 1, recurringPlans: 1/.test(billing), "Starter limits missing");
assert(/key: "growth"[\s\S]*brands: 1, socialAccounts: 3, recurringPlans: 1/.test(billing), "Growth limits missing");
assert(/key: "pro"[\s\S]*brands: 3, socialAccounts: 10, recurringPlans: 3/.test(billing), "Pro limits missing");
for (const label of ["billing.allContentTypes", "billing.aiImages", "billing.aiVideoReels", "billing.campaignsIncluded", "billing.automaticPublishing"]) {
  assert(billing.includes(label), `Pricing feature missing: ${label}`);
}
assert(billing.includes("billing.prorationText"), "Proration explanation missing");
assert(!billing.includes("window.location.href = payload.paymentUrl"), "Plan upgrades must not replace the Spreelo tab");
assert(billing.includes('window.open("about:blank", "spreelo-stripe-payment")'), "Upgrade payment tab flow missing");

const changeRoute = read("app/api/stripe/subscription/change/route.js");
assert(changeRoute.includes("requiresCustomerPayment"), "Paid-invoice redirect guard missing");
assert(changeRoute.includes('["draft", "open"].includes(invoiceStatus)'), "Invoice status payment guard missing");

const entitlements = read("lib/planEntitlements.js");
assert(entitlements.includes("socialAccounts: 10"), "Entitlement model missing Pro social accounts");
assert(entitlements.includes("recurringPlans: 3"), "Entitlement model missing Pro rolling plans");

const appLayout = read("components/AppLayout.jsx");
assert(appLayout.includes("requestNewBrand"), "Brand limit UX missing");
assert(appLayout.includes("PlanLimitModal"), "Brand plan-limit modal missing");

const social = read("app/social-channels/page.jsx");
assert(social.includes("payload?.planLimit"), "Social limit response UX missing");
for (const file of ["app/api/meta/connect/route.js", "app/api/auth/instagram/start/route.js", "app/api/auth/pinterest/start/route.js"]) {
  assert(read(file).includes("checkSocialConnectionCapacity"), `Social entitlement check missing in ${file}`);
}

const home = read("app/page.jsx");
assert(home.includes("parsePlanLimitDatabaseError"), "Rolling-plan activation limit UX missing");

const sql = read("supabase/v143_81_plan_entitlements.sql");
for (const trigger of ["spreelo_plan_brand_limit", "spreelo_plan_social_account_limit", "spreelo_plan_recurring_plan_limit"]) {
  assert(sql.includes(trigger), `Database trigger missing: ${trigger}`);
}
assert(sql.includes("when 'starter' then 1 when 'growth' then 3 when 'pro' then 10"), "Social limits do not match package decision");
assert(sql.includes("when 'starter' then 1 when 'growth' then 1 when 'pro' then 3"), "Rolling plan limits do not match package decision");

const sv = read("lib/i18n/builtInLocaleLabels.js");
assert(sv.includes('"billing.prorationTitle": "Så fungerar uppgraderingar"'), "Swedish proration copy missing");
assert(sv.includes('"billing.aiVideoReels": "AI-video / Reels"'), "Swedish AI video package copy missing");

console.log("v143.81 plan entitlement checks passed");
