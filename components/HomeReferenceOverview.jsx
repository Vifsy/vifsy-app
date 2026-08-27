"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Gift,
  History,
  Pause,
  Play,
  Plus,
  RefreshCw,
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

  return (
    <div className="home-reference-page">
      {message ? <p className="home-reference-message">{message}</p> : null}
      <header className="home-reference-header">
        <div><h1>{currentBrandName} översikt</h1><p>Planera, granska och publicera ditt innehåll.</p></div>
        <div className="home-reference-credits"><span /><div><small>Nuvarande krediter</small><strong>{creditsRemaining} <em>/ {monthlyCreditLimit || "—"} krediter kvar</em></strong></div></div>
      </header>

      <section className="home-reference-stats" aria-label="Översikt">
        <article><h2>Planerade inlägg</h2><strong>{plannedCount}</strong><p>Kommande</p></article>
        <article><h2>Väntar på godkännande</h2><strong className={pendingCount ? "attention" : ""}>{pendingCount}</strong><p>Behöver granskas</p></article>
        <article><h2>Publicerat denna månad</h2><strong>{publishedCount}</strong><p>Publicerade inlägg</p></article>
        <article><h2>Aktiva scheman</h2><strong>{activeSchedulesCount}</strong><p>Rullande planer</p></article>
      </section>

      <section className="home-reference-review">
        <ClipboardCheck />
        <div><strong>{pendingCount} inlägg väntar på ditt godkännande</strong><small>Granska och godkänn innan innehållet skickas vidare.</small></div>
        <a className="primary" href="/review?view=queue">Granska inlägg</a>
        <a href="/review?view=history"><History />Inläggshistorik<ArrowRight /></a>
      </section>

      <div className="home-reference-workspace">
        <section className="home-reference-plans">
          <header><h2>Innehållsplaner</h2></header>
          <article className="recurring"><RefreshCw /><div><h3>Återkommande scheman</h3><p>Veckoscheman som fortsätter skapa innehåll tills du pausar eller avslutar dem.</p></div><strong>{recurringCount}</strong><span>{recurringCount ? "Aktiva" : "Inga aktiva"}</span>{recurringCount ? <button type="button" className={`home-reference-manage-link${showRecurringSchedules ? " open" : ""}`} onClick={() => setShowRecurringSchedules((current) => !current)}>{showRecurringSchedules ? "Dölj scheman" : "Hantera scheman"}<ChevronDown /></button> : <a href="/automation">Skapa schema<ArrowRight /></a>}</article>

          {recurringCount > 0 && showRecurringSchedules ? (
            <div className="home-reference-recurring-manager home-reference-plan-manager recurring-manager">
              <div className="home-reference-recurring-manager-head">
                <div><strong>Pågående veckoscheman</strong><span>Här kan du se, pausa, återuppta eller avsluta dina återkommande planer.</span></div>
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

                      <div className="home-reference-recurring-meta">
                        <span><b>Nästa körning</b>{formatScheduleDate(plan?.next_run_at, plan?.rules?.[0]?.timezone)}</span>
                        <span><b>Plattform</b>{platforms.length ? platforms.join(" · ") : "—"}</span>
                      </div>

                      <div className="home-reference-recurring-actions">
                        {plan?.rules?.[0]?.id ? <a className="home-reference-open-item" href={`/plans/${plan.rules[0].id}`}>{openPlanLabel}<ArrowRight /></a> : null}
                        <button
                          type="button"
                          className="pause"
                          disabled={isBusy || typeof onSetRecurringScheduleState !== "function"}
                          onClick={() => onSetRecurringScheduleState?.(plan, isPaused ? "active" : "paused")}
                        >
                          {isPaused ? <Play /> : <Pause />}
                          {isBusy ? "Arbetar…" : isPaused ? "Återuppta" : "Pausa"}
                        </button>
                        <button
                          type="button"
                          className="end"
                          disabled={isBusy || typeof onSetRecurringScheduleState !== "function"}
                          onClick={() => {
                            if (window.confirm("Avsluta detta schema? Det kommer inte att skapa fler framtida inlägg.")) {
                              onSetRecurringScheduleState?.(plan, "ended");
                            }
                          }}
                        >
                          <Trash2 /> Avsluta
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <article className="scheduled"><CalendarDays /><div><h3>Planerade inlägg</h3><p>Engångsinlägg som ska skapas eller publiceras vid ett bestämt datum.</p></div><strong>{scheduledCount}</strong><span>{scheduledCount ? "Planerade" : "Inget planerat"}</span>{scheduledCount ? <button type="button" className={`home-reference-manage-link${showScheduledItems ? " open" : ""}`} onClick={() => setShowScheduledItems((current) => !current)}>{showScheduledItems ? "Dölj inlägg" : "Visa inlägg"}<ChevronDown /></button> : <a href="/automation">Planera inlägg<ArrowRight /></a>}</article>

          {scheduledCount > 0 && showScheduledItems ? (
            <div className="home-reference-recurring-manager home-reference-plan-manager scheduled-manager">
              <div className="home-reference-recurring-manager-head">
                <div><strong>Planerade engångsinlägg</strong><span>Varje planerat inlägg visas separat. Du kan öppna ett redan skapat inlägg eller ta bort en framtida planering.</span></div>
                <a href="/automation"><Plus /> Planera fler</a>
              </div>
              <div className="home-reference-recurring-list">
                {scheduledItems.map((item) => {
                  const isGeneratedPost = item?.item_kind === "post";
                  const isBusy = scheduleActionLoading === item?.id;
                  const platform = item?.platform || "—";
                  const rulePlan = isGeneratedPost ? null : {
                    ...item,
                    id: item.id,
                    ruleIds: [item.id],
                    rules: [item],
                    anyActive: item.is_active === true,
                  };

                  return (
                    <div className="home-reference-recurring-item home-reference-scheduled-item" key={`${item?.item_kind || "rule"}-${item.id}`}>
                      <div className="home-reference-recurring-status">
                        <span className="scheduled" />
                        <div><strong>{plannedItemTitle(item)}</strong><small>{isGeneratedPost ? "Skapat och schemalagt" : "Väntar på körning"}</small></div>
                      </div>
                      <div className="home-reference-recurring-meta">
                        <span><b>Datum & tid</b>{formatPlannedItemDate(item)}</span>
                        <span><b>Plattform</b>{platform}</span>
                      </div>
                      <div className="home-reference-recurring-actions">
                        {isGeneratedPost ? <a className="home-reference-open-item" href={`/posts/${item.id}`}>Öppna <ArrowRight /></a> : (
                          <button
                            type="button"
                            className="end"
                            disabled={isBusy || typeof onSetRecurringScheduleState !== "function"}
                            onClick={() => {
                              if (window.confirm("Ta bort detta planerade inlägg? Reserverade krediter frigörs om de ännu inte har använts.")) {
                                onSetRecurringScheduleState?.(rulePlan, "ended");
                              }
                            }}
                          >
                            <Trash2 /> {isBusy ? "Tar bort…" : "Ta bort"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <article className="campaign"><Gift /><div><h3>Kalenderkampanjer</h3><p>Aktiva kampanjplaner som skapats från din AI-kalender.</p></div><strong>{campaignCount}</strong><span>{campaignCount ? "Aktiva" : "Inga aktiva"}</span>{campaignCount ? <button type="button" className={`home-reference-manage-link${showCampaignSchedules ? " open" : ""}`} onClick={() => setShowCampaignSchedules((current) => !current)}>{showCampaignSchedules ? "Dölj kampanjer" : "Hantera kampanjer"}<ChevronDown /></button> : <a href="/calendar">Skapa kampanj<ArrowRight /></a>}</article>

          {campaignCount > 0 && showCampaignSchedules ? (
            <div className="home-reference-recurring-manager home-reference-plan-manager campaign-manager">
              <div className="home-reference-recurring-manager-head">
                <div><strong>Aktiva kalenderkampanjer</strong><span>Se nästa körning och pausa, återuppta eller avsluta kampanjplanen.</span></div>
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
                      <div className="home-reference-recurring-meta">
                        <span><b>Nästa körning</b>{formatScheduleDate(plan?.next_run_at, plan?.rules?.[0]?.timezone)}</span>
                        <span><b>Plattform</b>{platforms.length ? platforms.join(" · ") : "—"}</span>
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
