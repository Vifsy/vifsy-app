"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Gift,
  History,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

function formatScheduleDate(value, timeZone) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  try {
    return new Intl.DateTimeFormat("sv-SE", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

function formatPlannedItemDate(item) {
  if (item?.next_run_at) return formatScheduleDate(item.next_run_at, item?.timezone);
  if (item?.scheduled_for) return formatScheduleDate(item.scheduled_for, item?.timezone);
  if (item?.run_date && item?.publish_time) return `${item.run_date} · ${String(item.publish_time).slice(0, 5)}`;
  if (item?.run_date) return item.run_date;
  return "—";
}

function plannedItemTitle(item) {
  return item?.content_type_label || item?.idea || item?.name || item?.post_type || "Planerat inlägg";
}

function humanizeContentType(value) {
  const raw = String(value || "").trim();
  if (!raw) return "—";

  const labels = {
    website_item: "Produktinlägg",
    website_item_text_ad: "Produktannons",
    animated_website_item: "Animerad produkt-Reel",
    carousel_website_item: "Produktkarusell",
    ai_product_video: "AI-produktvideo",
    ai_image: "AI-bild",
    image: "AI-bild",
    text: "Textinlägg",
    faq: "FAQ",
    tips: "Tips",
    mini_guide: "Miniguide",
    checklist: "Checklista",
    problem_solution: "Problem → Lösning",
    seasonal: "Säsongsinlägg",
  };

  return labels[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function nextPlanFrom(plans = []) {
  return [...plans]
    .filter(Boolean)
    .sort((left, right) => {
      const leftTime = new Date(left?.next_run_at || left?.run_date || left?.created_at || 0).getTime();
      const rightTime = new Date(right?.next_run_at || right?.run_date || right?.created_at || 0).getTime();
      return leftTime - rightTime;
    })[0] || null;
}

function planPlatforms(plan) {
  const platforms = Array.isArray(plan?.platforms) ? plan.platforms.filter(Boolean) : [];
  if (platforms.length) return platforms.join(" · ");
  const fallback = plan?.rules?.map((rule) => rule?.platform).filter(Boolean) || [];
  return [...new Set(fallback)].join(" · ") || "—";
}

function planContentTypes(plan) {
  const types = Array.isArray(plan?.contentTypes) ? plan.contentTypes.filter(Boolean) : [];
  const fallback = plan?.rules
    ?.map((rule) => rule?.content_type_label || rule?.content_type_id || rule?.post_type)
    .filter(Boolean) || [];
  const unique = [...new Set(types.length ? types : fallback)].map(humanizeContentType);
  return unique.slice(0, 3).join(" · ") || "Varierat innehåll";
}

function plannedItemStatus(item) {
  if (item?.item_kind === "post") return "Skapat och schemalagt";
  const occurrence = String(item?.generation_occurrence_status || "").trim().toLowerCase();
  if (["running", "processing", "generating"].includes(occurrence)) return "Skapas nu";
  if (["failed", "error"].includes(occurrence)) return "Behöver åtgärd";
  if (["completed", "generated", "ready"].includes(occurrence)) return "Skapat";
  return "Väntar på körning";
}

export default function HomeReferenceOverview({
  message,
  loading,
  currentBrandId,
  currentBrandName,
  creditsRemaining,
  monthlyCreditLimit,
  plannedCount,
  pendingCount,
  publishedCount,
  activeSchedulesCount,
  recurringCount,
  scheduledCount,
  campaignCount,
  suggestedCampaign,
  recurringSchedules = [],
  scheduledItems = [],
  campaignSchedules = [],
  scheduleActionLoading = "",
  onSetRecurringScheduleState,
  openPlanLabel = "Open plan",
  accountActiveLabel = "Account is active",
}) {
  const [showRecurringSchedules, setShowRecurringSchedules] = useState(false);
  const [showScheduledItems, setShowScheduledItems] = useState(false);
  const [showCampaignSchedules, setShowCampaignSchedules] = useState(false);

  if (!loading && !currentBrandId) {
    return <section className="home-reference-no-brand"><h1>Inget varumärke valt</h1><p>Välj eller skapa ett varumärke för att öppna översikten.</p><a href="/brand">Öppna varumärkesprofil</a></section>;
  }

  const campaignTitle = suggestedCampaign?.title || "Öppna AI-kalendern för kampanjförslag";
  const campaignDate = suggestedCampaign?.date || "";
  const campaignHref = suggestedCampaign?.id ? `/automation?campaign=${suggestedCampaign.id}` : "/calendar";
  const nextRecurringPlan = nextPlanFrom(recurringSchedules);
  const nextScheduledItem = scheduledItems?.[0] || null;
  const nextCampaignPlan = nextPlanFrom(campaignSchedules);
  const nextRecurringPlatforms = nextRecurringPlan ? planPlatforms(nextRecurringPlan) : "";
  const nextCampaignPlatforms = nextCampaignPlan ? planPlatforms(nextCampaignPlan) : "";

  return (
    <div className="home-reference-page">
      {message ? <p className="home-reference-message">{message}</p> : null}
      <header className="home-reference-header">
        <div><h1>{currentBrandName} översikt</h1><p>Planera, granska och publicera ditt innehåll.</p></div>
        <div className="home-reference-credits">
          <span className="home-reference-credit-check"><CheckCircle2 aria-hidden="true" /></span>
          <div><small>Nuvarande krediter</small><strong>{creditsRemaining} <em>/ {monthlyCreditLimit || "—"}<span className="home-reference-credit-desktop-suffix"> krediter kvar</span></em></strong><span className="home-reference-credit-mobile-label">krediter kvar</span></div>
          <span className="home-reference-account-status"><i />{accountActiveLabel}</span>
        </div>
      </header>

      <section className="home-reference-stats" aria-label="Översikt">
        <article>
          <span className="home-reference-stat-icon"><CalendarDays aria-hidden="true" /></span>
          <div><h2>Planerade inlägg</h2><p>Kommande</p></div>
          <strong>{plannedCount}</strong>
        </article>
        <article>
          <span className="home-reference-stat-icon"><Clock3 aria-hidden="true" /></span>
          <div><h2>Väntar på godkännande</h2><p>Behöver granskas</p></div>
          <strong className={pendingCount ? "attention" : ""}>{pendingCount}</strong>
        </article>
        <article>
          <span className="home-reference-stat-icon"><Send aria-hidden="true" /></span>
          <div><h2>Publicerat denna månad</h2><p>Publicerade inlägg</p></div>
          <strong>{publishedCount}</strong>
        </article>
        <article>
          <span className="home-reference-stat-icon"><RefreshCw aria-hidden="true" /></span>
          <div><h2>Aktiva scheman</h2><p>Rullande planer</p></div>
          <strong>{activeSchedulesCount}</strong>
        </article>
      </section>

      <section className="home-reference-review">
        <ClipboardCheck />
        <div><strong>{pendingCount} inlägg väntar på ditt godkännande</strong><small>Granska och godkänn innan innehållet skickas vidare.</small></div>
        <a className="primary" href="/review?view=queue">Granska inlägg<ArrowRight className="home-reference-review-primary-arrow" aria-hidden="true" /></a>
        <a href="/review?view=history"><History /><span className="home-reference-review-desktop-label">Inläggshistorik</span><span className="home-reference-review-mobile-label">Visa innehållskalender</span><ArrowRight /></a>
      </section>

      <div className="home-reference-workspace">
        <section className="home-reference-plans">
          <header className="home-reference-plans-heading">
            <div>
              <h2>Innehållsplaner</h2>
              <p>Se vad som händer härnäst och öppna detaljer när du vill ändra något.</p>
            </div>
            <a className="home-reference-plans-show-all" href="/automation">Visa alla</a>
          </header>

          <article className="home-plan-overview-card recurring">
            <div className="home-plan-overview-icon"><RefreshCw aria-hidden="true" /></div>
            <div className="home-plan-overview-copy">
              <div className="home-plan-overview-title-row">
                <h3>Återkommande scheman</h3>
                <span className={`home-plan-overview-count${recurringCount ? " active" : ""}`}>{recurringCount ? `${recurringCount} aktiva` : "Inga aktiva"}</span>
              </div>
              <p>Veckoscheman som fortsätter skapa innehåll automatiskt tills du pausar eller avslutar dem.</p>
              {recurringCount && nextRecurringPlan ? (
                <div className="home-plan-overview-facts">
                  <span><b>Nästa</b>{formatScheduleDate(nextRecurringPlan?.next_run_at, nextRecurringPlan?.rules?.[0]?.timezone)}</span>
                  <span><b>Takt</b>{nextRecurringPlan?.postsPerWeek ? `${nextRecurringPlan.postsPerWeek} inlägg/vecka` : "Återkommande"}</span>
                  <span><b>Kanaler</b>{nextRecurringPlatforms}</span>
                </div>
              ) : <div className="home-plan-overview-empty">Inget återkommande schema körs just nu.</div>}
            </div>
            {recurringCount ? (
              <button type="button" className={`home-plan-overview-action${showRecurringSchedules ? " open" : ""}`} onClick={() => setShowRecurringSchedules((current) => !current)}>
                {showRecurringSchedules ? "Dölj detaljer" : "Visa detaljer"}<ChevronDown />
              </button>
            ) : <a className="home-plan-overview-action" href="/automation">Skapa schema<ArrowRight /></a>}
          </article>

          {recurringCount > 0 && showRecurringSchedules ? (
            <div className="home-reference-recurring-manager home-reference-plan-manager recurring-manager">
              <div className="home-reference-recurring-manager-head">
                <div><strong>Pågående veckoscheman</strong><span>Se nästa körning, innehållstyper och kanaler. Här kan du också pausa, återuppta eller avsluta planen.</span></div>
                <a href="/automation"><Plus /> Nytt schema</a>
              </div>

              <div className="home-reference-recurring-list">
                {recurringSchedules.map((plan) => {
                  const isPaused = plan?.plan_state === "paused" || !plan?.anyActive;
                  const isBusy = scheduleActionLoading === plan?.id;
                  const platforms = Array.isArray(plan?.platforms) ? plan.platforms.filter(Boolean) : [];

                  return (
                    <div className="home-reference-recurring-item" key={plan.id}>
                      <div className="home-reference-recurring-status">
                        <span className={isPaused ? "paused" : "active"} />
                        <div>
                          <strong>{plan?.name || "Innehållsplan"}</strong>
                          <small>{isPaused ? "Pausad" : "Aktiv"}{plan?.postsPerWeek ? ` · ${plan.postsPerWeek} inlägg/vecka` : ""}</small>
                        </div>
                      </div>

                      <div className="home-reference-recurring-meta home-reference-recurring-meta-rich">
                        <span><b>Nästa körning</b>{formatScheduleDate(plan?.next_run_at, plan?.rules?.[0]?.timezone)}</span>
                        <span><b>Kanaler</b>{platforms.length ? platforms.join(" · ") : "—"}</span>
                        <span><b>Innehåll</b>{planContentTypes(plan)}</span>
                      </div>

                      <div className="home-reference-recurring-actions">
                        {plan?.rules?.[0]?.id ? <a className="home-reference-open-item" href={`/plans/${plan.rules[0].id}`}>{openPlanLabel}<ArrowRight /></a> : null}
                        <button type="button" className="pause" disabled={isBusy || typeof onSetRecurringScheduleState !== "function"} onClick={() => onSetRecurringScheduleState?.(plan, isPaused ? "active" : "paused")}>
                          {isPaused ? <Play /> : <Pause />}{isBusy ? "Arbetar…" : isPaused ? "Återuppta" : "Pausa"}
                        </button>
                        <button type="button" className="end" disabled={isBusy || typeof onSetRecurringScheduleState !== "function"} onClick={() => {
                          if (window.confirm("Avsluta detta schema? Det kommer inte att skapa fler framtida inlägg.")) onSetRecurringScheduleState?.(plan, "ended");
                        }}><Trash2 /> Avsluta</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <article className="home-plan-overview-card scheduled">
            <div className="home-plan-overview-icon"><CalendarDays aria-hidden="true" /></div>
            <div className="home-plan-overview-copy">
              <div className="home-plan-overview-title-row">
                <h3>Planerade inlägg</h3>
                <span className={`home-plan-overview-count${scheduledCount ? " active" : ""}`}>{scheduledCount ? `${scheduledCount} kommande` : "Inget planerat"}</span>
              </div>
              <p>Engångsinlägg som skapas eller publiceras vid ett bestämt datum.</p>
              {scheduledCount && nextScheduledItem ? (
                <div className="home-plan-overview-next-item">
                  <span className="home-plan-overview-dot scheduled" />
                  <div><b>Nästa inlägg</b><strong>{plannedItemTitle(nextScheduledItem)}</strong></div>
                  <span><b>Datum & tid</b>{formatPlannedItemDate(nextScheduledItem)}</span>
                  <span><b>Kanal</b>{nextScheduledItem?.platform || "—"}</span>
                  <span className="home-plan-overview-status">{plannedItemStatus(nextScheduledItem)}</span>
                </div>
              ) : <div className="home-plan-overview-empty">Inga engångsinlägg ligger i kö.</div>}
            </div>
            {scheduledCount ? (
              <button type="button" className={`home-plan-overview-action${showScheduledItems ? " open" : ""}`} onClick={() => setShowScheduledItems((current) => !current)}>
                {showScheduledItems ? "Dölj detaljer" : "Visa detaljer"}<ChevronDown />
              </button>
            ) : <a className="home-plan-overview-action" href="/automation">Planera inlägg<ArrowRight /></a>}
          </article>

          {scheduledCount > 0 && showScheduledItems ? (
            <div className="home-reference-recurring-manager home-reference-plan-manager scheduled-manager">
              <div className="home-reference-recurring-manager-head">
                <div><strong>Planerade engångsinlägg</strong><span>Varje inlägg visas separat med typ, status, datum och kanal.</span></div>
                <a href="/automation"><Plus /> Planera fler</a>
              </div>
              <div className="home-reference-recurring-list">
                {scheduledItems.map((item) => {
                  const isGeneratedPost = item?.item_kind === "post";
                  const isBusy = scheduleActionLoading === item?.id;
                  const platform = item?.platform || "—";
                  const rulePlan = isGeneratedPost ? null : { ...item, id: item.id, ruleIds: [item.id], rules: [item], anyActive: item.is_active === true };

                  return (
                    <div className="home-reference-recurring-item home-reference-scheduled-item" key={`${item?.item_kind || "rule"}-${item.id}`}>
                      <div className="home-reference-recurring-status">
                        <span className="scheduled" />
                        <div><strong>{plannedItemTitle(item)}</strong><small>{plannedItemStatus(item)}</small></div>
                      </div>
                      <div className="home-reference-recurring-meta home-reference-recurring-meta-rich">
                        <span><b>Datum & tid</b>{formatPlannedItemDate(item)}</span>
                        <span><b>Kanal</b>{platform}</span>
                        <span><b>Typ</b>{humanizeContentType(item?.content_type_label || item?.content_type_id || item?.post_type || "Planerat inlägg")}</span>
                      </div>
                      <div className="home-reference-recurring-actions">
                        {isGeneratedPost ? <a className="home-reference-open-item" href={`/posts/${item.id}`}>Öppna <ArrowRight /></a> : (
                          <button type="button" className="end" disabled={isBusy || typeof onSetRecurringScheduleState !== "function"} onClick={() => {
                            if (window.confirm("Ta bort detta planerade inlägg? Reserverade krediter frigörs om de ännu inte har använts.")) onSetRecurringScheduleState?.(rulePlan, "ended");
                          }}><Trash2 /> {isBusy ? "Tar bort…" : "Ta bort"}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <article className="home-plan-overview-card campaign">
            <div className="home-plan-overview-icon"><Gift aria-hidden="true" /></div>
            <div className="home-plan-overview-copy">
              <div className="home-plan-overview-title-row">
                <h3>Kalenderkampanjer</h3>
                <span className={`home-plan-overview-count${campaignCount ? " active" : ""}`}>{campaignCount ? `${campaignCount} aktiva` : "Inga aktiva"}</span>
              </div>
              <p>Kampanjplaner från AI-kalendern som skapar innehåll enligt sina datum och teman.</p>
              {campaignCount && nextCampaignPlan ? (
                <div className="home-plan-overview-facts">
                  <span><b>Nästa kampanj</b>{nextCampaignPlan?.name || "Kalenderkampanj"}</span>
                  <span><b>Nästa körning</b>{formatScheduleDate(nextCampaignPlan?.next_run_at, nextCampaignPlan?.rules?.[0]?.timezone)}</span>
                  <span><b>Kanaler</b>{nextCampaignPlatforms}</span>
                </div>
              ) : <div className="home-plan-overview-empty">Ingen kalenderkampanj är aktiv just nu.</div>}
            </div>
            {campaignCount ? (
              <button type="button" className={`home-plan-overview-action${showCampaignSchedules ? " open" : ""}`} onClick={() => setShowCampaignSchedules((current) => !current)}>
                {showCampaignSchedules ? "Dölj detaljer" : "Visa detaljer"}<ChevronDown />
              </button>
            ) : <a className="home-plan-overview-action" href="/calendar">Skapa kampanj<ArrowRight /></a>}
          </article>

          {campaignCount > 0 && showCampaignSchedules ? (
            <div className="home-reference-recurring-manager home-reference-plan-manager campaign-manager">
              <div className="home-reference-recurring-manager-head">
                <div><strong>Aktiva kalenderkampanjer</strong><span>Se antal inlägg, nästa körning, kanaler och innehållstyper i varje kampanj.</span></div>
                <a href="/calendar"><Plus /> Ny kampanj</a>
              </div>
              <div className="home-reference-recurring-list">
                {campaignSchedules.map((plan) => {
                  const isPaused = plan?.plan_state === "paused" || !plan?.anyActive;
                  const isBusy = scheduleActionLoading === plan?.id;
                  const platforms = Array.isArray(plan?.platforms) ? plan.platforms.filter(Boolean) : [];
                  const postCount = Array.isArray(plan?.rules) ? plan.rules.filter((rule) => rule?.plan_state !== "ended").length : 0;
                  return (
                    <div className="home-reference-recurring-item home-reference-campaign-item" key={plan.id}>
                      <div className="home-reference-recurring-status">
                        <span className={isPaused ? "paused" : "campaign"} />
                        <div><strong>{plan?.name || "Kalenderkampanj"}</strong><small>{isPaused ? "Pausad" : "Aktiv"}{postCount ? ` · ${postCount} planerade inlägg` : ""}</small></div>
                      </div>
                      <div className="home-reference-recurring-meta home-reference-recurring-meta-rich">
                        <span><b>Nästa körning</b>{formatScheduleDate(plan?.next_run_at, plan?.rules?.[0]?.timezone)}</span>
                        <span><b>Kanaler</b>{platforms.length ? platforms.join(" · ") : "—"}</span>
                        <span><b>Innehåll</b>{planContentTypes(plan)}</span>
                      </div>
                      <div className="home-reference-recurring-actions">
                        <button type="button" className="pause" disabled={isBusy || typeof onSetRecurringScheduleState !== "function"} onClick={() => onSetRecurringScheduleState?.(plan, isPaused ? "active" : "paused")}>
                          {isPaused ? <Play /> : <Pause />}{isBusy ? "Arbetar…" : isPaused ? "Återuppta" : "Pausa"}
                        </button>
                        <button type="button" className="end" disabled={isBusy || typeof onSetRecurringScheduleState !== "function"} onClick={() => {
                          if (window.confirm("Avsluta denna kampanjplan? Den kommer inte att skapa fler framtida inlägg.")) onSetRecurringScheduleState?.(plan, "ended");
                        }}><Trash2 /> Avsluta</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="home-reference-coach">
          <h2>AI-coach</h2>
          <h3>Det här bör du göra nu</h3>
          <ol>
            <li><ClipboardCheck /><span>1.</span><a href="/review?view=queue">Granska {pendingCount} inlägg</a></li>
            <li><CalendarDays /><span>2.</span><a href="/automation">Planera innehåll för nästa vecka</a></li>
            <li><Gift /><span>3.</span><a href={campaignHref}>Skapa kampanjen</a></li>
          </ol>
          <div className="home-reference-suggestion"><small>Föreslagen kampanj</small><strong>{campaignTitle}</strong>{campaignDate ? <span>{campaignDate}</span> : null}<a href={campaignHref}>Skapa kampanjplan</a></div>
        </aside>
      </div>

      <footer className="home-reference-focus">
        <h2>Veckans fokus</h2>
        <span><ClipboardCheck /><strong>{pendingCount}</strong> inlägg att granska</span>
        <span><CalendarDays /><strong>{plannedCount}</strong> inlägg planerade</span>
        <span><Gift /><strong>{suggestedCampaign ? 1 : 0}</strong> kampanjförslag</span>
        <a href="/calendar">Öppna AI-kalendern<ArrowRight /></a>
      </footer>
    </div>
  );
}
