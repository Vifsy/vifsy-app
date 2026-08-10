"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useUiText } from "../lib/i18n/useUiText";

const PLANS = [
  { key: "starter", name: "Starter", credits: 150, month: 299, year: 2990, monthLookup: "spreelo_starter_monthly", yearLookup: "spreelo_starter_yearly" },
  { key: "growth", name: "Growth", credits: 350, month: 599, year: 5990, monthLookup: "spreelo_growth_monthly", yearLookup: "spreelo_growth_yearly", featured: true },
  { key: "pro", name: "Pro", credits: 750, month: 999, year: 9990, monthLookup: "spreelo_pro_monthly", yearLookup: "spreelo_pro_yearly" },
];

const CREDIT_PACKS = [
  { lookup: "spreelo_credits_100", credits: 100, price: 199 },
  { lookup: "spreelo_credits_250", credits: 250, price: 399, featured: true },
  { lookup: "spreelo_credits_500", credits: 500, price: 699 },
];

function cleanPlanName(value) {
  return String(value || "").trim().toLowerCase().replace(/^plan\s*:\s*/i, "");
}

export default function StripeBillingPanel({ initialBalance = null, onBalanceChange }) {
  const { t } = useUiText();
  const [billing, setBilling] = useState(initialBalance);
  const [interval, setInterval] = useState("month");
  const [loading, setLoading] = useState(true);
  const [busyLookup, setBusyLookup] = useState("");
  const [message, setMessage] = useState("");

  const currentPlan = cleanPlanName(billing?.subscription_plan || billing?.plan_name);
  const stripeSubscriptionStatus = String(billing?.subscription_status || "").toLowerCase();
  const hasStripeSubscription = Boolean(
    billing?.payment_provider === "stripe" &&
    billing?.provider_subscription_id &&
    ["active", "trialing", "past_due", "unpaid", "paused"].includes(stripeSubscriptionStatus)
  );
  const canBuyExtraCredits = Boolean(
    billing?.payment_provider === "stripe" &&
    billing?.provider_subscription_id &&
    ["active", "trialing"].includes(stripeSubscriptionStatus)
  );

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
  }

  async function refreshBilling() {
    try {
      const token = await getToken();
      if (!token) return;
      const response = await fetch("/api/stripe/status", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload?.billing) {
        setBilling(payload.billing);
        onBalanceChange?.(payload.billing);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCheckout(lookupKey) {
    if (busyLookup) return;
    setBusyLookup(lookupKey);
    setMessage("");
    try {
      const token = await getToken();
      if (!token) {
        window.location.href = "/login";
        return;
      }
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lookupKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) throw new Error(payload?.error || t("billing.checkoutError"));
      window.location.href = payload.url;
    } catch (error) {
      setMessage(error?.message || t("billing.checkoutError"));
      setBusyLookup("");
    }
  }

  const statusLabel = useMemo(() => {
    const status = String(billing?.subscription_status || "").toLowerCase();
    if (!status) return t("billing.notConnected");
    if (status === "active") return t("billing.statusActive");
    if (status === "trialing") return t("billing.statusTrialing");
    if (status === "past_due") return t("billing.statusPastDue");
    if (status === "canceled" || status === "cancelled") return t("billing.statusCanceled");
    return status.replace(/_/g, " ");
  }, [billing, t]);

  return (
    <section className="stripe-billing-v14377">
      <header className="stripe-billing-heading">
        <div>
          <p className="eyebrow">{t("billing.eyebrow")}</p>
          <h2>{t("billing.title")}</h2>
          <p>{t("billing.description")}</p>
        </div>
        <div className="stripe-billing-status">
          <span className={hasStripeSubscription ? "active" : ""} />
          <div><small>{t("billing.subscriptionStatus")}</small><strong>{loading ? t("billing.loading") : statusLabel}</strong></div>
        </div>
      </header>

      <div className="stripe-billing-toggle" role="group" aria-label={t("billing.billingPeriod")}>
        <button type="button" className={interval === "month" ? "active" : ""} onClick={() => setInterval("month")}>{t("billing.monthly")}</button>
        <button type="button" className={interval === "year" ? "active" : ""} onClick={() => setInterval("year")}>{t("billing.yearly")} <span>{t("billing.twoMonthsFree")}</span></button>
      </div>

      <div className="stripe-plan-grid">
        {PLANS.map((plan) => {
          const selected = currentPlan === plan.key;
          const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup;
          const price = interval === "month" ? plan.month : plan.year;
          return (
            <article key={plan.key} className={`stripe-plan-card ${plan.featured ? "featured" : ""} ${selected ? "current" : ""}`}>
              {plan.featured && <span className="stripe-plan-recommended"><Sparkles size={13} />{t("billing.recommended")}</span>}
              <div className="stripe-plan-name"><h3>{plan.name}</h3>{selected && <span><Check size={12} />{t("billing.current")}</span>}</div>
              <div className="stripe-plan-price"><strong>{price.toLocaleString("sv-SE")} kr</strong><span>/{interval === "month" ? t("billing.monthShort") : t("billing.yearShort")}</span></div>
              <p>{t("billing.creditsPerMonth", { count: plan.credits })}</p>
              <ul>
                <li><Check size={14} />{t("billing.aiContent")}</li>
                <li><Check size={14} />{t("billing.scheduling")}</li>
                <li><Check size={14} />{t("billing.campaigns")}</li>
              </ul>
              <button
                type="button"
                className="stripe-plan-action"
                disabled={busyLookup === lookup || (selected && hasStripeSubscription)}
                onClick={() => startCheckout(lookup)}
              >
                {busyLookup === lookup ? <LoaderCircle className="billing-spin" size={16} /> : <CreditCard size={15} />}
                {selected && hasStripeSubscription ? t("billing.currentPlan") : t("billing.choosePlan", { plan: plan.name })}
              </button>
            </article>
          );
        })}
      </div>

      <div className="stripe-credit-packs">
        <div className="stripe-credit-packs-copy">
          <p className="eyebrow">{t("billing.extraCreditsEyebrow")}</p>
          <h3>{t("billing.extraCreditsTitle")}</h3>
          <p>{t("billing.extraCreditsText")}</p>
        </div>
        <div className="stripe-credit-pack-grid">
          {CREDIT_PACKS.map((pack) => (
            <button key={pack.lookup} type="button" className={pack.featured ? "featured" : ""} disabled={Boolean(busyLookup) || !canBuyExtraCredits} onClick={() => startCheckout(pack.lookup)}>
              <span><Plus size={14} />{pack.credits} {t("billing.credits")}</span>
              <strong>{pack.price} kr</strong>
              {busyLookup === pack.lookup && <LoaderCircle className="billing-spin" size={14} />}
            </button>
          ))}
        </div>
      </div>

      {!canBuyExtraCredits && <p className="stripe-billing-pack-note">{t("billing.extraCreditsRequiresSubscription")}</p>}
      <p className="stripe-billing-footnote">{t("billing.managedPaymentsNote")}</p>
      {message && <p className="stripe-billing-message">{message}</p>}
    </section>
  );
}
