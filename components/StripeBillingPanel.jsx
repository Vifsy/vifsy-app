"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, CreditCard, ExternalLink, LoaderCircle, Plus, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useUiText } from "../lib/i18n/useUiText";

const COMMON_FEATURE_KEYS = [
  "billing.allContentTypes",
  "billing.aiImages",
  "billing.aiVideoReels",
  "billing.campaignsIncluded",
  "billing.automaticPublishing",
];

const PLANS = [
  {
    key: "starter", name: "Starter", credits: 150, month: 299, year: 2990,
    monthLookup: "spreelo_starter_monthly", yearLookup: "spreelo_starter_yearly", rank: 1,
    audienceKey: "billing.planAudienceStarter", brands: 1, socialAccounts: 1, recurringPlans: 1,
  },
  {
    key: "growth", name: "Growth", credits: 350, month: 599, year: 5990,
    monthLookup: "spreelo_growth_monthly", yearLookup: "spreelo_growth_yearly", featured: true, rank: 2,
    audienceKey: "billing.planAudienceGrowth", brands: 1, socialAccounts: 3, recurringPlans: 1,
  },
  {
    key: "pro", name: "Pro", credits: 750, month: 999, year: 9990,
    monthLookup: "spreelo_pro_monthly", yearLookup: "spreelo_pro_yearly", rank: 3,
    audienceKey: "billing.planAudiencePro", brands: 3, socialAccounts: 10, recurringPlans: 3,
  },
];

const CREDIT_PACKS = [
  { lookup: "spreelo_credits_100", credits: 100, price: 199 },
  { lookup: "spreelo_credits_250", credits: 250, price: 399, featured: true },
  { lookup: "spreelo_credits_500", credits: 500, price: 699 },
];

function cleanPlanName(value) {
  return String(value || "").trim().toLowerCase().replace(/^plan\s*:\s*/i, "").replace(/\s+trial$/i, "");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function StripeBillingPanel({ initialBalance = null, onBalanceChange }) {
  const { t } = useUiText();
  const [billing, setBilling] = useState(initialBalance);
  const [trialInfo, setTrialInfo] = useState(null);
  const [interval, setInterval] = useState("month");
  const [loading, setLoading] = useState(true);
  const [busyLookup, setBusyLookup] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [message, setMessage] = useState("");
  const [paymentLink, setPaymentLink] = useState("");

  const currentPlan = cleanPlanName(billing?.subscription_plan || billing?.plan_name || "free");
  const currentPlanConfig = PLANS.find((plan) => plan.key === currentPlan) || null;
  const currentRank = currentPlanConfig?.rank || 0;
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
  const isTrialing = stripeSubscriptionStatus === "trialing";
  const canChangePlan = stripeSubscriptionStatus === "active" && hasStripeSubscription;
  const cancelScheduled = Boolean(billing?.cancel_at_period_end);

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
      if (response.ok) {
        if (payload?.billing) {
          setBilling(payload.billing);
          onBalanceChange?.(payload.billing);
        }
        setTrialInfo(payload?.trial || null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCheckout(lookupKey, trial = false) {
    if (busyLookup || busyAction) return;
    setBusyLookup(lookupKey);
    setMessage("");
    try {
      const token = await getToken();
      if (!token) { window.location.href = "/login"; return; }
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lookupKey, trial }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.url) throw new Error(payload?.error || t("billing.checkoutError"));
      window.location.href = payload.url;
    } catch (error) {
      setMessage(error?.message || t("billing.checkoutError"));
      setBusyLookup("");
      refreshBilling();
    }
  }

  async function pollForPlanChange(lookupKey) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 900 : 1800));
      const token = await getToken();
      if (!token) return false;
      const response = await fetch("/api/stripe/status", { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) continue;
      if (payload?.billing) {
        setBilling(payload.billing);
        onBalanceChange?.(payload.billing);
      }
      if (String(payload?.billing?.subscription_price_lookup_key || "") === lookupKey) return true;
    }
    return false;
  }

  async function changeSubscription(lookupKey, openPaymentWindow = false) {
    if (busyLookup || busyAction) return;
    const paymentWindow = openPaymentWindow
      ? window.open("about:blank", "spreelo-stripe-payment")
      : null;
    setBusyLookup(lookupKey);
    setMessage("");
    setPaymentLink("");
    try {
      const token = await getToken();
      const response = await fetch("/api/stripe/subscription/change", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ lookupKey }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("billing.planChangeError"));
      if (payload?.paymentUrl) {
        if (paymentWindow) {
          paymentWindow.location.href = payload.paymentUrl;
          try { paymentWindow.focus(); } catch {}
          setMessage(t("billing.paymentOpenedNewTab"));
        } else {
          setPaymentLink(payload.paymentUrl);
          setMessage(t("billing.paymentNeedsOpening"));
        }
        void pollForPlanChange(lookupKey).then((changed) => {
          if (changed) {
            setPaymentLink("");
            setMessage(t("billing.planChanged"));
          }
        });
        return;
      }
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
      setMessage(payload?.scheduled ? t("billing.downgradeScheduled") : t("billing.planChangeProcessing"));
      if (!payload?.scheduled) {
        const changed = await pollForPlanChange(lookupKey);
        if (changed) setMessage(t("billing.planChanged"));
        else await refreshBilling();
      } else {
        await refreshBilling();
      }
    } catch (error) {
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
      setMessage(error?.message || t("billing.planChangeError"));
    } finally {
      setBusyLookup("");
    }
  }

  async function toggleCancellation(resume = false) {
    if (busyAction || busyLookup) return;
    setBusyAction(resume ? "resume" : "cancel");
    setMessage("");
    try {
      const token = await getToken();
      const response = await fetch("/api/stripe/subscription/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("billing.cancelError"));
      setMessage(resume ? t("billing.cancellationReversed") : t("billing.cancellationScheduled"));
      await refreshBilling();
    } catch (error) {
      setMessage(error?.message || t("billing.cancelError"));
    } finally {
      setBusyAction("");
    }
  }

  const statusLabel = useMemo(() => {
    const status = String(billing?.subscription_status || "").toLowerCase();
    if (!status || currentPlan === "free") return t("billing.statusFree");
    if (status === "active") return t("billing.statusActive");
    if (status === "trialing") return t("billing.statusTrialing");
    if (status === "past_due") return t("billing.statusPastDue");
    if (status === "canceled" || status === "cancelled") return t("billing.statusFree");
    return status.replace(/_/g, " ");
  }, [billing, currentPlan, t]);

  return (
    <section id="spreelo-plans" className="stripe-reference-billing">
      <div className="stripe-reference-layout">
        <div className="stripe-reference-table">
          <div className="stripe-reference-labels">
            <div className="head" />
            <div><strong>Pris</strong><small>Faktureras årligen</small></div>
            <div><strong>Krediter/månad</strong><small>Återställs varje månad</small></div>
            <div><strong>Företag</strong></div>
            <div><strong>Sociala konton</strong></div>
            <div><strong>Rullande planer</strong><small>Innehållsplaner</small></div>
            <div className="fit"><span>Passar för</span></div>
            <div className="action" />
          </div>
          {PLANS.map((plan) => {
            const selected = currentPlan === plan.key;
            const lookup = plan.yearLookup;
            const isUpgrade = canChangePlan && plan.rank > currentRank;
            const isImmediatePaidChange = Boolean(canChangePlan && plan.rank > currentRank);
            const disabled = busyLookup === lookup || (selected && hasStripeSubscription) || (isTrialing && !selected);
            let buttonLabel = selected && hasStripeSubscription ? "Hantera min plan" : `Välj ${plan.name}`;
            if (!selected && isUpgrade) buttonLabel = `Uppgradera till ${plan.name}`;
            if (!selected && canChangePlan && plan.rank < currentRank) buttonLabel = `Nedgradera till ${plan.name}`;
            const fitText = plan.key === "starter"
              ? "Småföretag som vill komma igång med konsekvent innehåll och publicering."
              : plan.key === "growth"
                ? "Växande varumärken som hanterar flera kanaler och behöver mer kapacitet."
                : "Byråer och marknadsföringsteam som driver flera varumärken och större innehållsproduktion.";
            return (
              <article key={plan.key} className={`stripe-reference-plan ${selected ? "current" : ""}`}>
                <header><h2>{plan.name}</h2>{selected ? <span>Nuvarande plan</span> : null}</header>
                <div className="price"><strong>{plan.year.toLocaleString("sv-SE")} kr</strong><small>/år</small></div>
                <div>{plan.credits} krediter/månad</div>
                <div>{plan.brands} {plan.brands === 1 ? "företag" : "företag"}</div>
                <div>{plan.socialAccounts === 1 ? "1 socialt konto" : `upp till ${plan.socialAccounts} sociala konton`}</div>
                <div>{plan.recurringPlans === 1 ? "1 rullande innehållsplan" : `upp till ${plan.recurringPlans} rullande innehållsplaner`}</div>
                <div className="fit">{fitText}</div>
                <div className="action"><button type="button" disabled={disabled} onClick={() => selected && hasStripeSubscription ? null : hasStripeSubscription ? changeSubscription(lookup, isImmediatePaidChange) : startCheckout(lookup, Boolean(trialInfo?.eligible))}>{busyLookup === lookup ? <LoaderCircle className="billing-spin" /> : null}{buttonLabel}</button></div>
              </article>
            );
          })}
        </div>
        <aside className="stripe-reference-packs">
          <h2>Fyll på extra krediter</h2>
          <p>Engångsköp av krediter läggs till ditt saldo och förfaller inte.</p>
          <div>{CREDIT_PACKS.map((pack) => <article key={pack.lookup}><span>+&nbsp; {pack.credits} krediter</span><strong>{pack.price} kr</strong><button type="button" disabled={Boolean(busyLookup) || Boolean(busyAction) || !canBuyExtraCredits} onClick={() => startCheckout(pack.lookup, false)}>{busyLookup === pack.lookup ? <LoaderCircle className="billing-spin" /> : "Köp"}</button></article>)}</div>
          <small>Priser inkl. moms.</small>
          <a href="#spreelo-credit-info">Läs mer om krediter →</a>
        </aside>
      </div>
      <div id="spreelo-credit-info" className="stripe-reference-benefits"><span><Check />Detta ingår i alla planer</span><span>Alla innehållstyper</span><span>AI-bilder</span><span>AI-video / Reels</span><span>Kampanjer</span><span>Automatisk publicering</span></div>
      <p className="stripe-reference-footnote">Planerna förnyas årligen. Du kan när som helst uppgradera, nedgradera eller avsluta.</p>
      {message ? <p className="stripe-billing-message">{message}</p> : null}
      {paymentLink ? <a className="stripe-billing-payment-link" href={paymentLink} target="_blank" rel="noreferrer">{t("billing.openPayment")} <ExternalLink /></a> : null}
    </section>
  );

  return (
    <section id="spreelo-plans" className="stripe-billing-v14377 stripe-billing-v14378">
      <header className="stripe-billing-heading">
        <div>
          <p className="eyebrow">{t("billing.eyebrow")}</p>
          <h2>{t("billing.title")}</h2>
          <p>{t("billing.description")}</p>
        </div>
        <div className="stripe-billing-status-wrap">
          <div className="stripe-billing-status">
            <span className={hasStripeSubscription ? "active" : ""} />
            <div><small>{t("billing.subscriptionStatus")}</small><strong>{loading ? t("billing.loading") : statusLabel}</strong></div>
          </div>
          {hasStripeSubscription && (
            <button type="button" className="stripe-billing-manage-action" disabled={Boolean(busyAction)} onClick={() => toggleCancellation(cancelScheduled)}>
              {busyAction ? <LoaderCircle className="billing-spin" size={14} /> : cancelScheduled ? <ShieldCheck size={14} /> : <XCircle size={14} />}
              {cancelScheduled ? t("billing.keepSubscription") : t("billing.cancelSubscription")}
            </button>
          )}
        </div>
      </header>

      {trialInfo?.eligible && !hasStripeSubscription && (
        <div className="stripe-trial-banner">
          <Sparkles size={18} />
          <div><strong>{t("billing.trialOfferTitle")}</strong><span>{t("billing.trialOfferText", { credits: trialInfo.credits || 100, days: trialInfo.days || 14 })}</span></div>
        </div>
      )}
      {!hasStripeSubscription && trialInfo && !trialInfo.eligible && ["business_already_trialed", "account_already_trialed", "account_trial_pending"].includes(trialInfo.reason) && (
        <div className="stripe-trial-banner muted"><ShieldCheck size={18} /><div><strong>{t("billing.trialUsedTitle")}</strong><span>{t("billing.trialUsedText")}</span></div></div>
      )}
      {!hasStripeSubscription && trialInfo && !trialInfo.eligible && trialInfo.reason === "website_required" && (
        <div className="stripe-trial-banner muted"><ShieldCheck size={18} /><div><strong>{t("billing.trialWebsiteTitle")}</strong><span>{t("billing.trialWebsiteText")}</span></div></div>
      )}
      {isTrialing && (
        <div className="stripe-trial-banner active"><CalendarClock size={18} /><div><strong>{t("billing.trialActiveTitle")}</strong><span>{t("billing.trialActiveText", { date: formatDate(billing?.trial_end) || "—" })}</span></div></div>
      )}
      {cancelScheduled && (
        <div className="stripe-trial-banner muted"><CalendarClock size={18} /><div><strong>{t("billing.cancellationScheduledTitle")}</strong><span>{t("billing.cancellationScheduledText", { date: formatDate(billing?.current_period_end) || "—" })}</span></div></div>
      )}
      {billing?.pending_subscription_plan && (
        <div className="stripe-trial-banner muted"><CalendarClock size={18} /><div><strong>{t("billing.pendingPlanTitle")}</strong><span>{t("billing.pendingPlanText", { plan: String(billing.pending_subscription_plan).replace(/^./, (c) => c.toUpperCase()), date: formatDate(billing?.pending_subscription_effective_at) || "—" })}</span></div></div>
      )}

      <div className="stripe-billing-toggle" role="group" aria-label={t("billing.billingPeriod")}>
        <button type="button" className={interval === "month" ? "active" : ""} onClick={() => setInterval("month")}>{t("billing.monthly")}</button>
        <button type="button" className={interval === "year" ? "active" : ""} onClick={() => setInterval("year")}>{t("billing.yearly")} <span>{t("billing.twoMonthsFree")}</span></button>
      </div>

      {canChangePlan && (
        <div className="stripe-plan-proration-note">
          <ShieldCheck size={17} />
          <div><strong>{t("billing.prorationTitle")}</strong><span>{t("billing.prorationText")}</span></div>
        </div>
      )}

      <div className="stripe-billing-main-grid">
        <div className="stripe-billing-plan-area">
      <div className="stripe-plan-grid">
        {PLANS.map((plan) => {
          const currentInterval = String(billing?.subscription_interval || "").toLowerCase();
          const selected = currentPlan === plan.key && currentInterval === interval;
          const samePlanDifferentInterval = currentPlan === plan.key && currentInterval && currentInterval !== interval;
          const viewingDifferentInterval = Boolean(canChangePlan && currentInterval && currentInterval !== interval);
          const lookup = interval === "month" ? plan.monthLookup : plan.yearLookup;
          const price = interval === "month" ? plan.month : plan.year;
          const isUpgrade = canChangePlan && plan.rank > currentRank;
          const isDowngrade = canChangePlan && plan.rank < currentRank;
          const isScheduledAtPeriodEnd = Boolean(
            canChangePlan &&
              (plan.rank < currentRank ||
                (plan.rank === currentRank && currentInterval === "year" && interval === "month"))
          );
          const isImmediatePaidChange = Boolean(
            canChangePlan &&
              (plan.rank > currentRank ||
                (plan.rank === currentRank && currentInterval === "month" && interval === "year"))
          );
          const disabled = busyLookup === lookup || (selected && hasStripeSubscription) || (isTrialing && !selected);
          let buttonLabel = t("billing.choosePlan", { plan: plan.name });
          if (!hasStripeSubscription && trialInfo?.eligible) buttonLabel = t("billing.startTrial");
          else if (selected && hasStripeSubscription) buttonLabel = t("billing.currentPlan");
          else if (viewingDifferentInterval) {
            buttonLabel = interval === "year"
              ? t("billing.switchToYearlyPlan", { plan: plan.name })
              : t("billing.switchToMonthlyPlan", { plan: plan.name });
          }
          else if (isUpgrade) buttonLabel = t("billing.upgradeTo", { plan: plan.name });
          else if (isDowngrade) buttonLabel = t("billing.downgradeTo", { plan: plan.name });
          return (
            <article key={plan.key} className={`stripe-plan-card ${plan.featured ? "featured" : ""} ${selected ? "current" : ""}`}>
              {plan.featured && <span className="stripe-plan-recommended"><Sparkles size={13} />{t("billing.recommended")}</span>}
              <div className="stripe-plan-name"><h3>{plan.name}</h3>{selected && <span><Check size={12} />{t("billing.current")}</span>}</div>
              <span className={`stripe-plan-audience ${plan.key}`}>{t(plan.audienceKey)}</span>
              <div className="stripe-plan-price"><strong>{price.toLocaleString("sv-SE")} kr</strong><span>/{interval === "month" ? t("billing.monthShort") : t("billing.yearShort")}</span></div>
              <p className="stripe-plan-credit-line">{t("billing.creditsPerMonth", { count: plan.credits })}</p>
              <ul>
                <li><Check size={15} />{t("billing.brandLimit", { count: plan.brands })}</li>
                <li><Check size={15} />{plan.socialAccounts === 1 ? t("billing.socialAccountLimitOne") : t("billing.socialAccountLimit", { count: plan.socialAccounts })}</li>
                <li><Check size={15} />{plan.recurringPlans === 1 ? t("billing.recurringPlanLimitOne") : t("billing.recurringPlanLimit", { count: plan.recurringPlans })}</li>
                {COMMON_FEATURE_KEYS.map((featureKey) => <li key={featureKey}><Check size={15} />{t(featureKey)}</li>)}
              </ul>
              <button
                type="button"
                className="stripe-plan-action"
                disabled={disabled}
                onClick={() => hasStripeSubscription ? changeSubscription(lookup, isImmediatePaidChange) : startCheckout(lookup, Boolean(trialInfo?.eligible))}
              >
                {busyLookup === lookup ? <LoaderCircle className="billing-spin" size={16} /> : <CreditCard size={15} />}
                {buttonLabel}
              </button>
              {samePlanDifferentInterval && hasStripeSubscription && (
                <small className="stripe-plan-change-note stripe-plan-current-interval-note">
                  {t("billing.currentIntervalPlan", {
                    plan: currentPlanConfig?.name || plan.name,
                    interval: currentInterval === "year" ? t("billing.intervalYearlyWord") : t("billing.intervalMonthlyWord"),
                  })}
                </small>
              )}
              {isScheduledAtPeriodEnd && <small className="stripe-plan-change-note">{t("billing.downgradeAtPeriodEnd")}</small>}
            </article>
          );
        })}
      </div>

        </div>

        <aside className="stripe-billing-side-rail">
      <div className="stripe-credit-packs">
        <div className="stripe-credit-packs-copy">
          <p className="eyebrow">{t("billing.extraCreditsEyebrow")}</p>
          <h3>{t("billing.extraCreditsTitle")}</h3>
          <p>{t("billing.extraCreditsText")}</p>
          {Math.min(Number(billing?.purchased_credits_remaining || 0), Number(billing?.credits_remaining || 0)) > 0 && <small>{t("billing.purchasedCreditsBalance", { count: Math.min(Number(billing?.purchased_credits_remaining || 0), Number(billing?.credits_remaining || 0)) })}</small>}
        </div>
        <div className="stripe-credit-pack-grid">
          {CREDIT_PACKS.map((pack) => (
            <button key={pack.lookup} type="button" className={pack.featured ? "featured" : ""} disabled={Boolean(busyLookup) || Boolean(busyAction) || !canBuyExtraCredits} onClick={() => startCheckout(pack.lookup, false)}>
              <span><Plus size={14} />{pack.credits} {t("billing.credits")}</span>
              <strong>{pack.price} kr</strong>
              {busyLookup === pack.lookup && <LoaderCircle className="billing-spin" size={14} />}
            </button>
          ))}
        </div>
      </div>

        </aside>
      </div>

      {!canBuyExtraCredits && <p className="stripe-billing-pack-note">{t("billing.extraCreditsRequiresSubscription")}</p>}
      <div className="stripe-credit-explainer">
        <Sparkles size={18} />
        <div><strong>{t("billing.howCreditsWorkTitle")}</strong><p>{t("billing.howCreditsWorkText")}</p></div>
      </div>
      <p className="stripe-billing-footnote">{t("billing.managedPaymentsNote")}</p>
      {message && (
        <div className="stripe-billing-message-row">
          <p className="stripe-billing-message">{message}</p>
          {paymentLink ? (
            <a className="stripe-billing-payment-link" href={paymentLink} target="_blank" rel="noreferrer">
              {t("billing.openPayment")} <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}
