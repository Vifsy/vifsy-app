import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`v144.76 failed: ${message}`); };

const css = read("app/styles/75-v144-75-billing-reference-final.css");
const billing = read("components/StripeBillingPanel.jsx");

assert(css.includes("grid-template-rows:78px 92px minmax(140px,1fr) 72px 66px !important;"), "plan rows were not expanded for readable copy");
assert(css.includes("font-size:29px !important;"), "desktop plan price is too small");
assert(css.includes(".stripe-reference-plan .stripe-reference-features .plan-feature") && css.includes("font-size:12px !important;"), "plan features readability target missing");
assert(css.includes(".stripe-reference-packs > p") && css.includes("font-size:12px !important;"), "extra-credit helper copy is still micro-text");
assert(css.includes(".stripe-reference-benefits span") && css.includes("font-size:11.5px !important;"), "shared benefits text is still too small");
assert(css.includes(".stripe-reference-credit-info h2") && css.includes("font-size:17px !important;"), "credit explainer heading is too small");
assert(css.includes(".stripe-reference-credit-info p") && css.includes("font-size:11.5px !important;"), "credit explainer body is too small");
assert(css.includes(".stripe-reference-account-actions .stripe-reference-cancel") && css.includes("font-size:10.5px !important;"), "subscription utility text is too small");
assert(css.includes("@media (max-width:520px)") && css.includes("button small { font-size:10.5px !important; }"), "mobile cadence helper text is too small");

// Functional regression guards.
assert(billing.includes('const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup'), "billing interval selection changed");
assert(billing.includes("changeSubscription(lookup, isImmediatePaidChange)"), "subscription change handler changed");
assert(billing.includes("startCheckout(pack.lookup, false)"), "extra credit checkout handler changed");
assert(billing.includes("toggleCancellation(cancelScheduled)"), "cancel/resume handler changed");

console.log("v144.76 billing readability and functional-regression checks passed.");
