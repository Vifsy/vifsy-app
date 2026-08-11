"use client";

import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Gift,
  History,
  Lightbulb,
  RefreshCw,
} from "lucide-react";

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
          <article className="recurring"><RefreshCw /><div><h3>Återkommande scheman</h3><p>Veckoscheman som fortsätter skapa innehåll tills du pausar eller avslutar dem.</p></div><strong>{recurringCount}</strong><span>{recurringCount ? "Aktiva" : "Inga aktiva"}</span><a href="/automation">Skapa schema<ArrowRight /></a></article>
          <article className="scheduled"><CalendarDays /><div><h3>Planerade inlägg</h3><p>Engångsplaner och inlägg som körs vid ett bestämt datum.</p></div><strong>{scheduledCount}</strong><span>{scheduledCount ? "Planerade" : "Inget planerat"}</span><a href="/automation">Planera inlägg<ArrowRight /></a></article>
          <article className="campaign"><Gift /><div><h3>Kalenderkampanjer</h3><p>Aktiva kampanjplaner som skapats från din AI-kalender.</p></div><strong>{campaignCount}</strong><span>{campaignCount ? "Aktiva" : "Inga aktiva"}</span><a href="/calendar">Skapa kampanj<ArrowRight /></a></article>
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
