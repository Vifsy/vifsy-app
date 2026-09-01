import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(`v144.75 failed: ${message}`); };

const billing = read("components/StripeBillingPanel.jsx");
const css = read("app/styles/75-v144-75-billing-reference-final.css");
const globals = read("app/globals.css");

assert(globals.includes('@import "./styles/75-v144-75-billing-reference-final.css";'), "v144.75 billing reference stylesheet import missing");
assert(css.includes('grid-template-columns:minmax(0,1fr) 245px !important;'), "desktop plan + credit rail layout missing");
assert(css.includes('grid-template-columns:repeat(3,minmax(0,1fr)) !important;'), "three equal plan columns missing");
assert(css.includes('.stripe-reference-plan.current > header') && css.includes('#fff5f0'), "current plan must use the soft peach header, not a dark header");
assert(css.includes('.stripe-reference-plan.current .action button:disabled') && css.includes('#f4512d'), "current plan CTA must remain Spreelo coral");
assert(css.includes('.stripe-reference-controls') && css.includes('justify-self:center !important;'), "billing cadence control is not centered over the plans");
assert(css.includes('.stripe-reference-benefits') && css.includes('linear-gradient(105deg,#03172a 0%,#0b2b46 100%)'), "included-benefits navy rail missing");
assert(css.includes('.stripe-reference-credit-info') && css.includes('background:#fff !important;'), "credit explainer must stay light");
assert(css.includes('@media (max-width:800px)') && css.includes('.stripe-reference-table { grid-template-columns:1fr !important;'), "mobile stacking regression guard missing");

assert(billing.includes('<strong>{t("billing.monthly")}</strong>'), "monthly cadence label missing");
assert(billing.includes('<strong>{t("billing.yearly")} <span>{t("billing.twoMonthsFree")}</span></strong>'), "yearly cadence savings label missing");
assert(billing.includes('<Layers />{t("billing.allContentTypes")}'), "content-type benefit icon missing");
assert(billing.includes('<GalleryHorizontalEnd />{t("billing.aiImages")}'), "AI-image benefit icon missing");
assert(billing.includes('<Clapperboard />{t("billing.aiVideoReels")}'), "AI-video benefit icon missing");
assert(billing.includes('<Megaphone />{t("billing.campaignsIncluded")}'), "campaign benefit icon missing");
assert(billing.includes('<CalendarDays />{t("billing.automaticPublishing")}'), "automatic-publishing benefit icon missing");
assert(billing.includes('className="stripe-reference-footer-row"'), "subscription controls must be moved out of the visual header");

// Functional regression guards: cadence and Stripe handlers are still the existing live paths.
assert(billing.includes('const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup'), "selected cadence no longer drives Stripe lookup");
assert(billing.includes('changeSubscription(lookup, isImmediatePaidChange)'), "subscription change handler missing");
assert(billing.includes('startCheckout(pack.lookup, false)'), "extra-credit checkout handler missing");
assert(billing.includes('toggleCancellation(cancelScheduled)'), "cancel/resume subscription control missing");

console.log("v144.75 final billing reference and functional-regression checks passed.");
