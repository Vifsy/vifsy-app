"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCopy,
  Download,
  ExternalLink,
  FileJson2,
  FileWarning,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../lib/supabaseClient";

async function getAdminHeaders(json = true) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusMeta(value) {
  const status = String(value || "");
  if (status === "completed") return { label: "Klar", tone: "success" };
  if (status === "imported" || status === "rescue_imported") return { label: "Väntar på godkännande", tone: "attention" };
  if (status === "exported") return { label: "Underlag skapat", tone: "attention" };
  if (status === "rescue_needed") return { label: "Behöver rescue", tone: "danger" };
  if (status === "queued") return { label: "Köad automatiskt", tone: "pending" };
  if (status === "running") return { label: "Uppdateras", tone: "pending" };
  if (status === "automatic_pending") return { label: "Väntar på årsjobb", tone: "pending" };
  if (status === "failed") return { label: "Misslyckad", tone: "danger" };
  return { label: "Behöver rescue", tone: "danger" };
}

function campaignDate(item) {
  if (item?.event_date) return item.event_date;
  if (item?.start_date && item?.end_date) return `${item.start_date} – ${item.end_date}`;
  return item?.start_date || item?.end_date || "Datum saknas";
}

export default function AdminRescueCenterPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("analysis");
  const [busyId, setBusyId] = useState("");
  const [files, setFiles] = useState({});
  const [search, setSearch] = useState("");
  const fileRefs = useRef({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const headers = await getAdminHeaders(false);
      const response = await fetch("/api/admin/rescue-center", { headers, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Kunde inte läsa Rescue Center.");
      setData(payload);
    } catch (loadError) {
      setError(loadError?.message || "Kunde inte läsa Rescue Center.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createAnnualCase(brand) {
    const headers = await getAdminHeaders();
    const response = await fetch("/api/admin/rescue-center", {
      method: "POST",
      headers,
      body: JSON.stringify({
        action: "prepare_annual_rescue",
        brandProfileId: brand.brand_profile_id,
        targetYear: data?.targetYear,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Kunde inte skapa års-rescue.");
    return payload?.rescueCase;
  }

  async function fetchBrief(caseId) {
    const headers = await getAdminHeaders(false);
    const response = await fetch(`/api/admin/rescue-center/export?caseId=${encodeURIComponent(caseId)}`, {
      headers,
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error || "Kunde inte skapa rescue-underlaget.");
    return payload;
  }

  async function ensureCase(item) {
    if (item?.id) return item;
    if (item?.rescue_case?.id) return item.rescue_case;
    return createAnnualCase(item);
  }

  async function downloadBrief(item) {
    const key = item?.id || item?.brand_profile_id;
    setBusyId(`brief:${key}`);
    setMessage("");
    try {
      const rescueCase = await ensureCase(item);
      const payload = await fetchBrief(rescueCase.id);
      const blob = new Blob([JSON.stringify(payload.brief, null, 2)], { type: "application/json;charset=utf-8" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = payload.filename || "spreelo-rescue.json";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      setMessage("Rescue-underlaget är skapat. Ladda upp JSON-filen i ChatGPT.");
      await load();
    } catch (actionError) {
      setError(actionError?.message || "Kunde inte skapa underlaget.");
    } finally {
      setBusyId("");
    }
  }

  async function copyPrompt(item) {
    const key = item?.id || item?.brand_profile_id;
    setBusyId(`copy:${key}`);
    setMessage("");
    try {
      const rescueCase = await ensureCase(item);
      const payload = await fetchBrief(rescueCase.id);
      await navigator.clipboard.writeText(payload?.brief?.prompt || "");
      setMessage("ChatGPT-uppdraget är kopierat. JSON-underlaget innehåller dessutom all strukturerad kontext.");
      await load();
    } catch (actionError) {
      setError(actionError?.message || "Kunde inte kopiera uppdraget.");
    } finally {
      setBusyId("");
    }
  }

  async function uploadPackage(rescueCase) {
    const file = files[rescueCase.id];
    if (!file) {
      setError("Välj ZIP-filen från ChatGPT först.");
      return;
    }
    setBusyId(`upload:${rescueCase.id}`);
    setMessage("");
    setError("");
    try {
      const headers = await getAdminHeaders(false);
      const form = new FormData();
      form.append("case_id", rescueCase.id);
      form.append("file", file);
      const response = await fetch("/api/admin/rescue-center/import", { method: "POST", headers, body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Importen misslyckades.");
      setMessage(`Import klar: ${payload?.preview?.campaign_count || 0} kampanjer verifierades och väntar på ditt godkännande.`);
      setFiles((current) => ({ ...current, [rescueCase.id]: null }));
      if (fileRefs.current[rescueCase.id]) fileRefs.current[rescueCase.id].value = "";
      await load();
    } catch (actionError) {
      setError(actionError?.message || "Importen misslyckades.");
    } finally {
      setBusyId("");
    }
  }

  async function retryCalendarEmail(brand) {
    setBusyId(`email:${brand.brand_profile_id}`);
    setMessage("");
    setError("");
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/rescue-center", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "retry_calendar_email",
          brandProfileId: brand.brand_profile_id,
          targetYear: brand.target_year,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Kunde inte skicka kalendermejlet.");
      setMessage(payload?.email?.sent ? "Kalendermejlet skickades." : "Kalendermejlet var redan skickat eller låst för leverans.");
      await load();
    } catch (actionError) {
      setError(actionError?.message || "Kunde inte skicka kalendermejlet.");
    } finally {
      setBusyId("");
    }
  }

  async function setCalendarMode(brand, mode) {
    setBusyId(`mode:${brand.brand_profile_id}`);
    setMessage("");
    setError("");
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/rescue-center", {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "set_calendar_mode", brandProfileId: brand.brand_profile_id, mode }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Kunde inte ändra kalenderläge.");
      setMessage(mode === "automatic" ? "Varumärket använder automatisk årsuppdatering igen." : "Varumärket är markerat för manuell års-rescue.");
      await load();
    } catch (actionError) {
      setError(actionError?.message || "Kunde inte ändra kalenderläge.");
    } finally {
      setBusyId("");
    }
  }

  async function approveCase(rescueCase) {
    setBusyId(`approve:${rescueCase.id}`);
    setMessage("");
    setError("");
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/rescue-center/approve", {
        method: "POST",
        headers,
        body: JSON.stringify({ caseId: rescueCase.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Godkännandet misslyckades.");
      const emailText = payload?.email?.sent
        ? " Kunden har också fått uppdateringsmejlet."
        : payload?.email?.skipped
          ? " Kundmejlet var redan skickat."
          : payload?.email?.error
            ? " Kalendern/analysen är sparad, men mejlet behöver skickas om automatiskt senare."
            : "";
      setMessage(`Rescue godkänd. ${payload?.campaignCount || 0} kampanjer är aktiva.${emailText}`);
      await load();
    } catch (actionError) {
      setError(actionError?.message || "Godkännandet misslyckades.");
    } finally {
      setBusyId("");
    }
  }

  const annualFiltered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data?.annualBrands || [];
    return (data?.annualBrands || []).filter((item) =>
      [item.business_name, item.website_url, item.status, item.content_market]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [data, search]);

  function renderImportControls(rescueCase) {
    if (!rescueCase || rescueCase.status === "completed") return null;
    const imported = rescueCase.status === "imported" && rescueCase.imported_manifest;
    return (
      <div className="rescue109-import-zone">
        {!imported ? (
          <>
            <label className="rescue109-file-picker">
              <Upload size={16} />
              <span>{files[rescueCase.id]?.name || "Välj ZIP från ChatGPT"}</span>
              <input
                ref={(node) => { if (node) fileRefs.current[rescueCase.id] = node; }}
                type="file"
                accept=".zip,.json,application/zip,application/json"
                onChange={(event) => setFiles((current) => ({ ...current, [rescueCase.id]: event.target.files?.[0] || null }))}
              />
            </label>
            <button type="button" className="rescue109-secondary" disabled={busyId === `upload:${rescueCase.id}`} onClick={() => uploadPackage(rescueCase)}>
              {busyId === `upload:${rescueCase.id}` ? <LoaderCircle className="rescue109-spin" size={16} /> : <Upload size={16} />}
              Importera och förhandsgranska
            </button>
          </>
        ) : (
          <button type="button" className="rescue109-approve" disabled={busyId === `approve:${rescueCase.id}`} onClick={() => approveCase(rescueCase)}>
            {busyId === `approve:${rescueCase.id}` ? <LoaderCircle className="rescue109-spin" size={16} /> : <CheckCircle2 size={16} />}
            Godkänn {rescueCase.case_type === "annual_calendar" ? "kalender" : "analys"}
          </button>
        )}
      </div>
    );
  }

  function renderPreview(rescueCase) {
    const manifest = rescueCase?.imported_manifest;
    if (!manifest || rescueCase.status !== "imported") return null;
    return (
      <div className="rescue109-preview">
        <div className="rescue109-preview-head">
          <div><span>FÖRHANDSGRANSKNING</span><strong>{manifest.campaign_opportunities?.length || 0} kampanjer</strong></div>
          <ShieldCheck size={20} />
        </div>
        {rescueCase.case_type === "brand_analysis" ? (
          <div className="rescue109-profile-preview">
            <span><b>Företag</b>{manifest.profile?.business_name || "—"}</span>
            <span><b>Bransch</b>{manifest.profile?.industry || "—"}</span>
            <span><b>Målgrupp</b>{manifest.profile?.target_audience || "—"}</span>
            <span><b>Marknad</b>{manifest.market_setup?.contentMarket || "—"}</span>
          </div>
        ) : null}
        <div className="rescue109-campaign-list">
          {(manifest.campaign_opportunities || []).slice(0, 12).map((campaign, index) => (
            <div key={`${campaign.slug || campaign.title}-${index}`}>
              <strong>{campaign.title}</strong>
              <span>{campaignDate(campaign)}</span>
              <small>{campaign.campaign_category || campaign.event_type || "Kampanj"} · {campaign.recommended_post_count || 0} inlägg</small>
            </div>
          ))}
        </div>
        <div className="rescue109-sources">
          <b>Verifierade källor</b>
          {(manifest.verified_sources || []).slice(0, 6).map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.url}<ExternalLink size={12} /></a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <main className="rescue109-page">
        <header className="rescue109-hero">
          <div>
            <span className="rescue109-kicker">ADMIN · RESCUE CENTER</span>
            <h1>Rädda det automatiken inte kan läsa</h1>
            <p>Samla misslyckade webbplatsanalyser, produktinlägg och årliga kalenderuppdateringar på ett ställe. Efter manuell rescue går kunden tillbaka till Spreelos vanliga flöde.</p>
          </div>
          <button type="button" className="rescue109-refresh" onClick={load} disabled={loading}><RefreshCw className={loading ? "rescue109-spin" : ""} size={17} /> Uppdatera</button>
        </header>

        {error ? <div className="rescue109-alert error"><AlertTriangle size={18} />{error}</div> : null}
        {message ? <div className="rescue109-alert success"><CheckCircle2 size={18} />{message}</div> : null}

        {loading && !data ? (
          <section className="rescue109-loading"><LoaderCircle className="rescue109-spin" size={28} /> Läser rescue-köerna…</section>
        ) : (
          <>
            <section className="rescue109-stats">
              <article><FileWarning size={20} /><div><strong>{data?.counts?.failedAnalyses || 0}</strong><span>Misslyckade analyser</span></div></article>
              <article><FileJson2 size={20} /><div><strong>{data?.counts?.failedPosts || 0}</strong><span>Misslyckade inlägg</span></div></article>
              <article><CalendarDays size={20} /><div><strong>{data?.counts?.annualCompleted || 0}/{data?.counts?.annualTotal || 0}</strong><span>Kalendrar {data?.targetYear}</span></div></article>
              <article><ShieldCheck size={20} /><div><strong>{data?.counts?.annualManual || 0}</strong><span>Års-rescue behövs</span></div></article>
            </section>

            <nav className="rescue109-tabs" aria-label="Rescue Center">
              <button type="button" className={tab === "analysis" ? "active" : ""} onClick={() => setTab("analysis")}>Misslyckade analyser <b>{data?.counts?.failedAnalyses || 0}</b></button>
              <button type="button" className={tab === "posts" ? "active" : ""} onClick={() => setTab("posts")}>Misslyckade inlägg <b>{data?.counts?.failedPosts || 0}</b></button>
              <button type="button" className={tab === "annual" ? "active" : ""} onClick={() => setTab("annual")}>Kalender {data?.targetYear} <b>{data?.counts?.annualTotal || 0}</b></button>
            </nav>

            {tab === "analysis" ? (
              <section className="rescue109-section">
                <div className="rescue109-section-head"><div><span>WEBBPLATSANALYS</span><h2>Analyser som behöver manuell hjälp</h2><p>Spreelo skapar ett strukturerat ChatGPT-underlag. Importen granskas här innan profilen och kalendern aktiveras.</p></div></div>
                {(data?.analysisCases || []).length ? (data.analysisCases.map((rescueCase) => {
                  const meta = statusMeta(rescueCase.status);
                  return <article className="rescue109-case" key={rescueCase.id}>
                    <div className="rescue109-case-top">
                      <div><span className={`rescue109-status ${meta.tone}`}>{meta.label}</span><h3>{rescueCase.brand?.business_name || "Okänt varumärke"}</h3><a href={rescueCase.brand?.website_url || "#"} target="_blank" rel="noreferrer">{rescueCase.brand?.website_url || "Webbplats saknas"}<ExternalLink size={13} /></a></div>
                      <small>{formatDate(rescueCase.updated_at)}</small>
                    </div>
                    <div className="rescue109-failure"><AlertTriangle size={16} /><div><b>{rescueCase.error_code || "analysis_failed"}</b><span>{rescueCase.error_message || "Analysen kunde inte slutföras automatiskt."}</span></div></div>
                    <div className="rescue109-actions">
                      <button type="button" className="rescue109-primary" disabled={busyId === `brief:${rescueCase.id}`} onClick={() => downloadBrief(rescueCase)}><Download size={16} /> Skapa rescue-underlag</button>
                      <button type="button" className="rescue109-ghost" disabled={busyId === `copy:${rescueCase.id}`} onClick={() => copyPrompt(rescueCase)}><ClipboardCopy size={16} /> Kopiera ChatGPT-uppdrag</button>
                    </div>
                    {renderPreview(rescueCase)}
                    {renderImportControls(rescueCase)}
                  </article>;
                })) : <div className="rescue109-empty"><CheckCircle2 size={28} /><strong>Inga analyser behöver rescue</strong><span>Nya terminala analysfel hamnar här automatiskt.</span></div>}
              </section>
            ) : null}

            {tab === "posts" ? (
              <section className="rescue109-section">
                <div className="rescue109-section-head"><div><span>INLÄGGSRESCUE</span><h2>Misslyckade produktinlägg</h2><p>Det befintliga produkt-rescueflödet ligger kvar i godkännandekön. Rescue Center ger en gemensam överblick utan att duplicera den fungerande importlogiken.</p></div><a className="rescue109-primary link" href="/admin/post-approvals?view=failed">Öppna misslyckade inlägg <ExternalLink size={15} /></a></div>
                {(data?.productFailures || []).length ? <div className="rescue109-table-wrap"><table className="rescue109-table"><thead><tr><th>Varumärke</th><th>Typ</th><th>Fel</th><th>Rescue</th><th>Uppdaterad</th></tr></thead><tbody>{data.productFailures.map((item) => <tr key={item.id}><td><strong>{item.brand?.business_name || "—"}</strong><span>{item.source_url || item.brand?.website_url || ""}</span></td><td>{item.content_type_label || item.content_type_id || "—"}<span>{item.platform || ""}</span></td><td>{item.failure_code || "—"}<span>{item.failure_stage || ""}</span></td><td><span className={`rescue109-status ${item.rescue_status === "needed" ? "danger" : "attention"}`}>{item.rescue_status || "needed"}</span></td><td>{formatDate(item.updated_at)}</td></tr>)}</tbody></table></div> : <div className="rescue109-empty"><CheckCircle2 size={28} /><strong>Inga produktinlägg behöver rescue</strong><span>Terminala produktfel visas här när de uppstår.</span></div>}
              </section>
            ) : null}

            {tab === "annual" ? (
              <section className="rescue109-section">
                <div className="rescue109-section-head annual"><div><span>ÅRLIG FÖRNYELSE</span><h2>Kampanjkalender {data?.targetYear}</h2><p>Automatiska varumärken uppdateras av årsjobbet. Varumärken som tidigare krävt manuell webbplats-rescue får ett färdigt rescue-underlag här.</p></div><label className="rescue109-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sök varumärke eller webbplats…" /></label></div>
                <div className="rescue109-progress"><div><span style={{ width: `${data?.counts?.annualTotal ? Math.round((data.counts.annualCompleted / data.counts.annualTotal) * 100) : 0}%` }} /></div><p><b>{data?.counts?.annualCompleted || 0}</b> av <b>{data?.counts?.annualTotal || 0}</b> kalendrar klara · <b>{data?.counts?.annualManual || 0}</b> behöver manuell rescue</p></div>
                <div className="rescue109-annual-list">
                  {annualFiltered.map((brand) => {
                    const meta = statusMeta(brand.status);
                    const rescueCase = brand.rescue_case;
                    const canManual = brand.status === "rescue_needed" || brand.status === "rescue_imported" || brand.calendar_generation_mode === "manual_rescue";
                    return <article className="rescue109-annual-row" key={brand.brand_profile_id}>
                      <div className="rescue109-brand"><strong>{brand.business_name || "Okänt varumärke"}</strong><span>{brand.website_url || "Webbplats saknas"}</span></div>
                      <div className="rescue109-year"><span>Nu</span><b>{brand.current_calendar_year || "—"}</b></div>
                      <div className="rescue109-year"><span>Nästa</span><b>{brand.target_year}</b></div>
                      <span className={`rescue109-status ${meta.tone}`}>{meta.label}</span>
                      <div className="rescue109-email-state">{brand.customer_email?.status === "sent" ? <><CheckCircle2 size={15} /> Kund informerad</> : brand.status === "completed" ? <><AlertTriangle size={15} /> Mail väntar</> : <span>—</span>}</div>
                      <div className="rescue109-row-actions">
                        {canManual && brand.status !== "completed" ? <>
                          <button type="button" className="rescue109-icon-btn" title="Skapa rescue-underlag" onClick={() => downloadBrief(rescueCase || brand)} disabled={busyId === `brief:${rescueCase?.id || brand.brand_profile_id}`}><Download size={16} /></button>
                          <button type="button" className="rescue109-icon-btn" title="Kopiera ChatGPT-uppdrag" onClick={() => copyPrompt(rescueCase || brand)}><ClipboardCopy size={16} /></button>
                        </> : null}
                        {brand.status === "completed" && brand.customer_email?.status !== "sent" ? <button type="button" className="rescue109-icon-btn" title="Skicka kalendermejl igen" onClick={() => retryCalendarEmail(brand)} disabled={busyId === `email:${brand.brand_profile_id}`}><RefreshCw className={busyId === `email:${brand.brand_profile_id}` ? "rescue109-spin" : ""} size={16} /></button> : null}
                        {brand.calendar_generation_mode === "manual_rescue" ? <button type="button" className="rescue109-icon-btn" title="Använd automatisk kalenderuppdatering igen" onClick={() => setCalendarMode(brand, "automatic")} disabled={busyId === `mode:${brand.brand_profile_id}`}><ShieldCheck size={16} /></button> : null}
                      </div>
                      {rescueCase && rescueCase.status !== "completed" ? <div className="rescue109-annual-detail">{renderPreview(rescueCase)}{renderImportControls(rescueCase)}</div> : null}
                    </article>;
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </AppLayout>
  );
}
