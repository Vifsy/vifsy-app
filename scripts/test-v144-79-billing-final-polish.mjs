import fs from "node:fs";
import assert from "node:assert/strict";

const globals = fs.readFileSync("app/globals.css", "utf8");
const css = fs.readFileSync("app/styles/77-v144-79-billing-final-polish.css", "utf8");
const billing = fs.readFileSync("components/StripeBillingPanel.jsx", "utf8");

assert.match(globals, /77-v144-79-billing-final-polish\.css/);
assert.match(css, /stripe-reference-benefits span[\s\S]*font-size:12\.25px/);
assert.match(css, /stripe-reference-credit-info p[\s\S]*font-size:12\.25px/);
assert.match(css, /stripe-reference-per-brand-note[\s\S]*font-size:11\.75px/);
assert.match(css, /stripe-reference-status[\s\S]*border-radius:999px/);
assert.match(css, /stripe-reference-footnote[\s\S]*font-size:12px/);
assert.match(billing, /credits: 150/);
assert.match(billing, /credits: 450/);
assert.match(billing, /credits: 1000/);
assert.match(billing, /brands: 2, socialAccounts: 5, recurringPlans: 3/);
assert.match(billing, /brands: 5, socialAccounts: null, recurringPlans: 8/);

console.log("v144.79 billing final polish checks passed");
