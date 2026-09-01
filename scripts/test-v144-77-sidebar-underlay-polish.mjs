import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`v144.77 failed: ${message}`); };

const globals = read("app/globals.css");
const underlay = read("app/styles/76-v144-77-sidebar-underlay-polish.css");
const billingCss = read("app/styles/75-v144-75-billing-reference-final.css");
const billingPanel = read("components/StripeBillingPanel.jsx");
const entitlements = read("lib/planEntitlements.js");
const stripeBilling = read("lib/stripeBilling.js");

assert(globals.includes('76-v144-77-sidebar-underlay-polish.css'), "v144.77 stylesheet is not imported");
assert(underlay.includes(':has(.settings-reference-page)'), "Settings-only sidebar underlay selector missing");
assert(underlay.includes('255px 100% no-repeat'), "Sidebar underlay does not match the 255px settings sidebar column");
assert(underlay.includes('var(--spreelo-sidebar)') && underlay.includes('var(--spreelo-sidebar-deep)'), "Sidebar underlay is not using the sidebar palette");
assert(underlay.includes('@media (min-width: 801px)'), "Sidebar underlay must stay desktop-only");

// Preserve the approved billing reference layout and live handlers.
assert(billingCss.includes('grid-template-columns:minmax(0,1fr) 245px !important;'), "desktop plan + credit rail layout changed");
assert(billingCss.includes('grid-template-columns:repeat(3,minmax(0,1fr)) !important;'), "three equal plan columns changed");
assert(billingCss.includes('.stripe-reference-plan.current > header') && billingCss.includes('#fff5f0'), "soft current-plan styling changed");
assert(billingCss.includes('.stripe-reference-benefits') && billingCss.includes('linear-gradient(105deg,#03172a 0%,#0b2b46 100%)'), "navy included-benefits rail changed");
assert(billingPanel.includes('const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup'), "billing interval selection changed");
assert(billingPanel.includes('changeSubscription(lookup, isImmediatePaidChange)'), "subscription change handler changed");
assert(billingPanel.includes('startCheckout(pack.lookup, false)'), "extra credit checkout handler changed");
assert(billingPanel.includes('toggleCancellation(cancelScheduled)'), "cancel/resume handler changed");

// Preserve package limits and monthly allowances.
assert(/starter:[\s\S]*brands: 1,[\s\S]*socialAccounts: 1,[\s\S]*recurringPlans: 1/.test(entitlements), "Starter entitlements changed unexpectedly");
assert(/growth:[\s\S]*brands: 1,[\s\S]*socialAccounts: 3,[\s\S]*recurringPlans: 1/.test(entitlements), "Growth entitlements changed unexpectedly");
assert(/pro:[\s\S]*brands: 3,[\s\S]*socialAccounts: 10,[\s\S]*recurringPlans: 3/.test(entitlements), "Pro entitlements changed unexpectedly");
assert(/starter:[\s\S]*credits: 150/.test(stripeBilling), "Starter monthly credits changed unexpectedly");
assert(/growth:[\s\S]*credits: 350/.test(stripeBilling), "Growth monthly credits changed unexpectedly");
assert(/pro:[\s\S]*credits: 750/.test(stripeBilling), "Pro monthly credits changed unexpectedly");

console.log("v144.77 sidebar underlay, billing-layout and entitlement regression checks passed");
