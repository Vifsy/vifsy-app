"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
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
        <section className="home-reference-plans home-reference-plans-v153">
          <header className="home-reference-plans-heading">
            <div>
              <h2>Innehållsplaner</h2>
              <p>Se dina aktiva planer och kommande inlägg direkt i översikten.</p>
            </div>
            <a className="home-reference-plans-show-all" href="/automation">Visa alla</a>
          </header>

          <article className="home-plan-overview-card recurring home-plan-section-v153">
            <div className="home-plan-section-head-v153">
              <div className="home-plan-overview-icon"><RefreshCw aria-hidden="true" /></div>
              <div className="home-plan-overview-copy">
                <div className="home-plan-overview-title-row">
                  <h3>Återkommande scheman</h3>
                  <span className={`home-plan-overview-count${recurringCount ? " active" : ""}`}>{recurringCount ? `${recurringCount} aktiva` : "Inga aktiva"}</span>
                </div>
                <p>Veckoscheman som fortsätter skapa innehåll automatiskt tills du pausar eller avslutar dem.</p>
              </div>
              <a className="home-plan-overview-action" href="/automation"><Plus />{recurringCount ? "Nytt schema" : "Skapa schema"}<ArrowRight /></a>
            </div>

            {recurringSchedules?.length ? (
              <div className="home-plan-inline-list-v153 recurring-list-v153">
                {recurringSchedules.map((plan) => {
                  const isPaused = plan?.plan_state === "paused" || !plan?.anyActive;
                  const isBusy = scheduleActionLoading === plan?.id;
                  const platforms = Array.isArray(plan?.platforms) ? plan.platforms.filter(Boolean) : [];
                  return (
                    <div className="home-plan-inline-row-v153 recurring-row-v153" key={plan.id}>
                      <div className="home-plan-inline-main-v153">
                        <span className={`home-plan-inline-dot-v153 ${isPaused ? "paused" : "recurring"}`} />
                        <div>
                          <strong>{plan?.name || "Innehållsplan"}</strong>
                          <span className={`home-plan-inline-state-v153 ${isPaused ? "paused" : "active"}`}>{isPaused ? "Pausad" : "Aktiv"}</span>
                        </div>
                      </div>
                      <div className="home-plan-inline-meta-v153">
                        <span><b>Nästa körning</b>{formatScheduleDate(plan?.next_run_at, plan?.rules?.[0]?.timezone)}</span>
                        <span><b>Takt</b>{plan?.postsPerWeek ? `${plan.postsPerWeek} inlägg/vecka` : "Återkommande"}</span>
                        <span><b>Kanaler</b>{platforms.length ? platforms.join(" · ") : "—"}</span>
                        <span><b>Innehåll</b>{planContentTypes(plan)}</span>
                      </div>
                      <div className="home-plan-inline-actions-v153">
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
            ) : null}
          </article>

          <article className="home-plan-overview-card scheduled home-plan-section-v153">
            <div className="home-plan-section-head-v153">
              <div className="home-plan-overview-icon"><CalendarDays aria-hidden="true" /></div>
              <div className="home-plan-overview-copy">
                <div className="home-plan-overview-title-row">
                  <h3>Planerade inlägg</h3>
                  <span className={`home-plan-overview-count${scheduledCount ? " active" : ""}`}>{scheduledCount ? `${scheduledCount} kommande` : "Inget planerat"}</span>
                </div>
                <p>Engångsinlägg som skapas eller publiceras vid ett bestämt datum.</p>
              </div>
              <a className="home-plan-overview-action" href="/automation"><Plus />{scheduledCount ? "Planera fler" : "Planera inlägg"}<ArrowRight /></a>
            </div>

            {scheduledItems?.length ? (
              <div className="home-plan-inline-list-v153 scheduled-list-v153">
                {scheduledItems.map((item) => {
                  const isGeneratedPost = item?.item_kind === "post";
                  const isBusy = scheduleActionLoading === item?.id;
                  const platform = item?.platform || "—";
                  const rulePlan = isGeneratedPost ? null : { ...item, id: item.id, ruleIds: [item.id], rules: [item], anyActive: item.is_active === true };
                  return (
                    <div className="home-plan-inline-row-v153 scheduled-row-v153" key={`${item?.item_kind || "rule"}-${item.id}`}>
                      <div className="home-plan-inline-main-v153">
                        <span className="home-plan-inline-dot-v153 scheduled" />
                        <div>
                          <strong>{plannedItemTitle(item)}</strong>
                          <span className="home-plan-inline-state-v153 scheduled">{plannedItemStatus(item)}</span>
                        </div>
                      </div>
                      <div className="home-plan-inline-meta-v153">
                        <span><b>Datum & tid</b>{formatPlannedItemDate(item)}</span>
                        <span><b>Kanal</b>{platform}</span>
                        <span><b>Typ</b>{humanizeContentType(item?.content_type_label || item?.content_type_id || item?.post_type || "Planerat inlägg")}</span>
                      </div>
                      <div className="home-plan-inline-actions-v153">
                        {isGeneratedPost ? <a className="home-reference-open-item" href={`/posts/${item.id}`}>Öppna<ArrowRight /></a> : (
                          <button type="button" className="end" disabled={isBusy || typeof onSetRecurringScheduleState !== "function"} onClick={() => {
                            if (window.confirm("Ta bort detta planerade inlägg? Reserverade krediter frigörs om de ännu inte har använts.")) onSetRecurringScheduleState?.(rulePlan, "ended");
                          }}><Trash2 />{isBusy ? "Tar bort…" : "Ta bort"}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>

          <article className="home-plan-overview-card campaign home-plan-section-v153">
            <div className="home-plan-section-head-v153">
              <div className="home-plan-overview-icon"><Gift aria-hidden="true" /></div>
              <div className="home-plan-overview-copy">
                <div className="home-plan-overview-title-row">
                  <h3>Kalenderkampanjer</h3>
                  <span className={`home-plan-overview-count${campaignCount ? " active" : ""}`}>{campaignCount ? `${campaignCount} aktiva` : "Inga aktiva"}</span>
                </div>
                <p>Kampanjplaner från AI-kalendern som skapar innehåll enligt sina datum och teman.</p>
              </div>
              <a className="home-plan-overview-action" href="/calendar"><Plus />Skapa kampanj<ArrowRight /></a>
            </div>

            {campaignSchedules?.length ? (
              <div className="home-plan-inline-list-v153 campaign-list-v153">
                {campaignSchedules.map((plan) => {
                  const isPaused = plan?.plan_state === "paused" || !plan?.anyActive;
                  const isBusy = scheduleActionLoading === plan?.id;
                  const platforms = Array.isArray(plan?.platforms) ? plan.platforms.filter(Boolean) : [];
                  const postCount = Array.isArray(plan?.rules) ? plan.rules.filter((rule) => rule?.plan_state !== "ended").length : 0;
                  return (
                    <div className="home-plan-inline-row-v153 campaign-row-v153" key={plan.id}>
                      <div className="home-plan-inline-main-v153">
                        <span className={`home-plan-inline-dot-v153 ${isPaused ? "paused" : "campaign"}`} />
                        <div>
                          <strong>{plan?.name || "Kalenderkampanj"}</strong>
                          <span className={`home-plan-inline-state-v153 ${isPaused ? "paused" : "campaign"}`}>{isPaused ? "Pausad" : "Aktiv"}{postCount ? ` · ${postCount} inlägg` : ""}</span>
                        </div>
                      </div>
                      <div className="home-plan-inline-meta-v153">
                        <span><b>Nästa körning</b>{formatScheduleDate(plan?.next_run_at, plan?.rules?.[0]?.timezone)}</span>
                        <span><b>Kanaler</b>{platforms.length ? platforms.join(" · ") : "—"}</span>
                        <span><b>Innehåll</b>{planContentTypes(plan)}</span>
                      </div>
                      <div className="home-plan-inline-actions-v153">
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
            ) : null}
          </article>
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
