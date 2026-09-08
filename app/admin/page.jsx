"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coins,
  FileCheck2,
  FlaskConical,
  ImagePlus,
  Languages,
  LayoutGrid,
  LoaderCircle,
  Music2,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Shapes,
  Users,
  Video,
  XCircle,
} from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../lib/supabaseClient";

const EMPTY_STATS = {
  users: 0,
  brands: 0,
  posts: 0,
  activeAutomations: 0,
  failedMedia: 0,
  pendingApproval: 0,
  completedOccurrences: 0,
  failedOccurrences: 0,
  refundedCredits: 0,
  openRescueCases: 0,
  postsThisMonth: 0,
  actionRequired: 0,
};

const EMPTY_INSIGHTS = {
  periodDays: 30,
  topFormats: [],
  topCountries: [],
  daily: [],
  totals: {},
};

function formatDateTime(value, withTime = true) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("sv-SE", withTime
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" }
    ).format(new Date(value));
  } catch {
    return "—";
  }
}

function formatUsd(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "—";
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(3)}`;
}

function countryFlag(code) {
  const normalized = String(code || "").toUpperCase();
  const known = { SE: "🇸🇪", DK: "🇩🇰", NO: "🇳🇴", DE: "🇩🇪", NL: "🇳🇱", FI: "🇫🇮", GB: "🇬🇧", US: "🇺🇸" };
  return known[normalized] || "🌍";
}

function countryName(code) {
  const normalized = String(code || "").toUpperCase();
  const known = { SE: "Sverige", DK: "Danmark", NO: "Norge", DE: "Tyskland", NL: "Nederländerna", FI: "Finland", GB: "Storbritannien", US: "USA", OTHER: "Övriga" };
  return known[normalized] || normalized || "Övriga";
}

function friendlyFormatName(value) {
  const raw = String(value || "Okänd typ");
  const map = {
    website_item: "Produktinlägg",
    website_carousel: "Produktkarusell",
    website_item_text_ad: "AI-produktannons",
    animated_website_item: "Produkt-Reel",
    ai_image: "AI-bild",
    text: "Textinlägg",
    faq: "FAQ",
    tips: "Tips",
    mini_guide: "Miniguide",
    checklist: "Checklista",
    problem_solution: "Problem → Lösning",
  };
  return map[raw] || raw.replace(/_/g, " ");
}

async function getAdminHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function StatusDot({ status }) {
  return <span className={`admin156-status-dot ${status || "unknown"}`} aria-hidden="true" />;
}

function MiniMetric({ icon: Icon, label, value, sub, tone = "violet", href }) {
  const content = (
    <>
      <span className={`admin156-metric-icon ${tone}`}><Icon size={21} /></span>
      <span className="admin156-metric-copy"><small>{label}</small><strong>{value}</strong><em>{sub}</em></span>
      {href ? <ArrowRight size={18} className="admin156-metric-arrow" /> : null}
    </>
  );
  return href ? <a className={`admin156-metric ${tone}`} href={href}>{content}</a> : <article className={`admin156-metric ${tone}`}>{content}</article>;
}

function QuickGroup({ tone, title, icon: Icon, children }) {
  return (
    <section className={`admin156-quick-group ${tone}`}>
      <div className="admin156-quick-title"><span><Icon size={22} /></span><h3>{title}</h3></div>
      <div className="admin156-quick-list">{children}</div>
    </section>
  );
}

function QuickLink({ href, icon: Icon, title, text, badge }) {
  return (
    <a className="admin156-quick-link" href={href}>
      <span className="admin156-quick-link-icon"><Icon size={17} /></span>
      <span><strong>{title}</strong><small>{text}</small></span>
      {badge ? <b>{badge}</b> : null}
      <ArrowRight size={17} />
    </a>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [insights, setInsights] = useState(EMPTY_INSIGHTS);
  const [generationCosts, setGenerationCosts] = useState({ periodDays: 30, samples: 0, averageUsd: 0, medianUsd: 0, formats: [] });
  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [health, setHealth] = useState({ systems: [], incidents: [], summary: { up: 0, degraded: 0, down: 0 }, checkedAt: null, migrationRequired: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminName, setAdminName] = useState("Admin");
  const [translationLocales, setTranslationLocales] = useState([]);
  const [translationStatuses, setTranslationStatuses] = useState({});
  const [selectedLocales, setSelectedLocales] = useState([]);
  const [translationSaving, setTranslationSaving] = useState(false);
  const [translationMessage, setTranslationMessage] = useState("");
  const [backgroundJobCount, setBackgroundJobCount] = useState(0);
  const [backgroundStopping, setBackgroundStopping] = useState(false);
  const [backgroundStopMessage, setBackgroundStopMessage] = useState("");

  useEffect(() => { loadAdminData(); }, []);

  async function loadAdminData() {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const metadata = session?.user?.user_metadata || {};
      const fullName = String(metadata.full_name || metadata.name || session?.user?.email || "Admin").trim();
      setAdminName(fullName.split(/\s+/)[0] || "Admin");
      const headers = await getAdminHeaders();
      const [overviewResponse, translationsResponse, backgroundJobsResponse, healthResponse] = await Promise.all([
        fetch("/api/admin/overview", { headers, cache: "no-store" }),
        fetch("/api/admin/translations", { headers, cache: "no-store" }),
        fetch("/api/admin/openai-background-jobs", { headers, cache: "no-store" }),
        fetch("/api/admin/system-health", { headers, cache: "no-store" }),
      ]);
      const [overviewPayload, translationsPayload, backgroundPayload, healthPayload] = await Promise.all([
        overviewResponse.json().catch(() => ({})),
        translationsResponse.json().catch(() => ({})),
        backgroundJobsResponse.json().catch(() => ({})),
        healthResponse.json().catch(() => ({})),
      ]);
      if (!overviewResponse.ok) throw new Error(overviewPayload?.error || "Kunde inte läsa adminöversikten.");
      setStats({ ...EMPTY_STATS, ...(overviewPayload.stats || {}) });
      setInsights({ ...EMPTY_INSIGHTS, ...(overviewPayload.insights || {}) });
      setGenerationCosts(overviewPayload.generationCosts || { periodDays: 30, samples: 0, averageUsd: 0, medianUsd: 0, formats: [] });
      setRecentAdjustments(overviewPayload.recentAdjustments || []);
      setWarnings(overviewPayload.warnings || []);
      if (translationsResponse.ok) {
        setTranslationLocales((translationsPayload.locales || []).filter((item) => item.locale !== translationsPayload.defaultLocale));
        setTranslationStatuses(translationsPayload.statuses || {});
      }
      setBackgroundJobCount(backgroundJobsResponse.ok ? Number(backgroundPayload?.counts?.total || 0) : 0);
      if (healthResponse.ok) setHealth(healthPayload);
      else setWarnings((current) => [...current, { key: "health", message: healthPayload?.error || "Systemstatus kunde inte läsas." }]);
    } catch (loadError) {
      setError(loadError?.message || "Kunde inte läsa adminöversikten.");
    } finally {
      setLoading(false);
    }
  }

  function toggleLocale(locale) {
    setSelectedLocales((current) => current.includes(locale) ? current.filter((item) => item !== locale) : [...current, locale]);
  }

  async function requestTranslationRefresh() {
    if (!selectedLocales.length) return;
    setTranslationSaving(true);
    setTranslationMessage("");
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/translations", { method: "POST", headers, body: JSON.stringify({ locales: selectedLocales }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Kunde inte begära översättningsuppdatering.");
      setTranslationMessage(`${selectedLocales.length} språk har lagts i kö för uppdatering.`);
      setSelectedLocales([]);
    } catch (saveError) {
      setTranslationMessage(saveError?.message || "Kunde inte begära översättningsuppdatering.");
    } finally {
      setTranslationSaving(false);
    }
  }

  async function stopOpenAIBackgroundJobs() {
    if (!window.confirm("Stoppa alla pågående OpenAI-bakgrundsjobb som Spreelo spårar?")) return;
    setBackgroundStopping(true);
    setBackgroundStopMessage("");
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/openai-background-jobs", { method: "POST", headers, body: JSON.stringify({ confirm: true }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Kunde inte stoppa bakgrundsjobben.");
      const stopped = Number(payload?.campaignCancelled || 0) + Number(payload?.brandCancelled || 0);
      setBackgroundJobCount(0);
      setBackgroundStopMessage(`${stopped} OpenAI-jobb avbröts.`);
    } catch (stopError) {
      setBackgroundStopMessage(stopError?.message || "Kunde inte stoppa bakgrundsjobben.");
    } finally {
      setBackgroundStopping(false);
    }
  }

  const generated30d = Number(insights?.totals?.postsCreated || 0);
  const successRate = Math.round(Number(insights?.totals?.successRate ?? 1) * 100);
  const systemProblems = Number(health?.summary?.down || 0) + Number(health?.summary?.degraded || 0);
  const healthAvailable = Array.isArray(health?.systems) && health.systems.length > 0;
  const allSystemsHealthy = healthAvailable && systemProblems === 0;
  const requestedLocaleCount = useMemo(() => Object.values(translationStatuses || {}).filter((packs) => (packs || []).some((pack) => pack.status === "refresh_requested")).length, [translationStatuses]);

  const dailyBars = useMemo(() => {
    const raw = insights?.daily || [];
    const max = Math.max(1, ...raw.map((row) => Math.max(Number(row.generated || 0), Number(row.published || 0))));
    return raw.slice(-30).map((row) => ({ ...row, max }));
  }, [insights]);

  const formatDonut = useMemo(() => {
    const rows = (insights?.topFormats || []).slice(0, 6);
    const total = Math.max(1, rows.reduce((sum, row) => sum + Number(row.value || 0), 0));
    let cursor = 0;
    const palette = ["#7c3aed", "#9b75f5", "#b8a3ff", "#ff7455", "#f5b547", "#46c7a4"];
    const stops = rows.map((row, index) => {
      const start = cursor;
      cursor += Number(row.value || 0) / total * 100;
      return `${palette[index % palette.length]} ${start}% ${cursor}%`;
    });
    return { rows, total, background: stops.length ? `conic-gradient(${stops.join(",")})` : "#eef1f6" };
  }, [insights]);

  return (
    <AppLayout active="admin">
      <div className="admin156-shell admin-page">
        <header className="admin156-topbar">
          <div><h1>Adminpanel</h1><p>Översikt, kunder, innehåll, krediter och systemstatus – allt på ett ställe.</p></div>
          <div className="admin156-top-actions">
            <button type="button" onClick={loadAdminData}><RefreshCw size={16} /> Uppdatera</button>
            <span className={`admin156-overall-status ${allSystemsHealthy ? "up" : "problem"}`}><StatusDot status={allSystemsHealthy ? "up" : healthAvailable ? "degraded" : "unknown"} /> {allSystemsHealthy ? "Alla system online" : healthAvailable ? `${systemProblems} system kräver koll` : "Systemstatus otillgänglig"}</span>
          </div>
        </header>

        {error ? <div className="admin156-alert danger"><AlertTriangle size={18} /><span>{error}</span><button onClick={loadAdminData}>Försök igen</button></div> : null}
        {warnings.length ? <div className="admin156-alert warning"><AlertTriangle size={18} /><span>Översikten är delvis laddad. {warnings.length} datakälla kunde inte läsas.</span></div> : null}

        {loading ? (
          <div className="admin156-loading"><LoaderCircle className="admin-spin" size={26} /> Laddar adminpanelen…</div>
        ) : (
          <>
            <section className="admin156-hero">
              <div className="admin156-hero-title"><span>ADMIN</span><h2>Välkommen, {adminName}</h2><p>Här är det viktigaste just nu.</p></div>
              <div className="admin156-hero-note">Mer synlighet<br/>för dina kunder ↘</div>
              <div className="admin156-kpis">
                <MiniMetric icon={Users} label="Kunder" value={Number(stats.brands || 0).toLocaleString("sv-SE")} sub="Aktiva varumärken" tone="violet" href="/admin/customers" />
                <MiniMetric icon={FileCheck2} label="Inlägg" value={Number(stats.postsThisMonth || 0).toLocaleString("sv-SE")} sub="Genererade denna månad" tone="violet" href="/admin/post-approvals" />
                <MiniMetric icon={CheckCircle2} label="Genereringsframgång" value={`${successRate}%`} sub="Senaste 30 dagarna" tone="green" />
                <MiniMetric icon={AlertTriangle} label="Kräver åtgärd" value={Number(stats.actionRequired || 0).toLocaleString("sv-SE")} sub="Väntar just nu" tone="red" href="/admin/post-approvals" />
              </div>
              <div className="admin156-priority-strip">
                <a href="/admin/rescue-center"><AlertTriangle size={18}/><strong>{Number(stats.failedMedia || 0) + Number(stats.openRescueCases || 0)}</strong><span>Misslyckade / rescue</span><ArrowRight size={16}/></a>
                <a href="/admin/post-approvals"><Clock3 size={18}/><strong>{Number(stats.pendingApproval || 0)}</strong><span>Väntar på godkännande</span><ArrowRight size={16}/></a>
                <a href="#systemstatus"><ShieldCheck size={18}/><strong>{systemProblems}</strong><span>Systemproblem</span><ArrowRight size={16}/></a>
                <a className="admin156-priority-all" href="/admin/post-approvals">Visa alla ärenden <ArrowRight size={16}/></a>
              </div>
            </section>

            <section className="admin156-section">
              <div className="admin156-section-head"><div><h2>Vad vill du göra?</h2><p>Snabbåtkomst till de vanligaste funktionerna.</p></div></div>
              <div className="admin156-quick-grid">
                <QuickGroup tone="violet" title="Kunder & innehåll" icon={Users}>
                  <QuickLink href="/admin/customers" icon={Users} title="Kundlista & konton" text="Hantera kunder, varumärken och status" />
                  <QuickLink href="/admin/post-approvals" icon={FileCheck2} title="Godkännanden" text="Granska och publicera inlägg" badge={stats.pendingApproval || null} />
                  <QuickLink href="/admin/mass-tests" icon={FlaskConical} title="Masstest" text="Kör analys och innehåll för flera kunder" />
                </QuickGroup>
                <QuickGroup tone="orange" title="Kreativa bibliotek" icon={ImagePlus}>
                  <QuickLink href="/admin/image-backgrounds" icon={ImagePlus} title="Bildbakgrunder" text="Ladda upp och hantera bakgrunder" />
                  <QuickLink href="/video-backgrounds" icon={Video} title="Videobakgrunder" text="Ladda upp och hantera videobibliotek" />
                  <QuickLink href="/admin/music-library" icon={Music2} title="Videomusik" text="Hantera musikbiblioteket" />
                </QuickGroup>
                <QuickGroup tone="green" title="Ekonomi & krediter" icon={Coins}>
                  <QuickLink href="/admin/credits" icon={CircleDollarSign} title="Kreditjusteringar" text="Lägg till eller ta bort krediter" />
                  <QuickLink href="/admin/content-credits" icon={Coins} title="Innehåll & krediter" text="Se saldo, krediter och innehållsekonomi" />
                  <QuickLink href="#kostnader" icon={BarChart3} title="Faktiska AI-kostnader" text="Median och snitt per innehållstyp" />
                </QuickGroup>
                <QuickGroup tone="blue" title="System & kvalitet" icon={Settings2}>
                  <QuickLink href="/admin/rescue-center" icon={AlertTriangle} title="Rescue Center" text="Hantera misslyckade analyser och jobb" badge={stats.openRescueCases || null} />
                  <QuickLink href="#translations" icon={Languages} title="Översättningar" text={`${requestedLocaleCount} språk väntar på uppdatering`} />
                  <QuickLink href="/admin/content-formats" icon={LayoutGrid} title="Innehållsformat" text="Format, tillgänglighet och standarder" />
                  <QuickLink href="/admin/icons" icon={Shapes} title="Ikoner" text="Hantera det visuella ikonbiblioteket" />
                </QuickGroup>
              </div>
            </section>

            <section className="admin156-section admin156-performance">
              <div className="admin156-section-head"><div><h2>Hur går Spreelo?</h2><p>Utveckling och nyckeltal för de senaste 30 dagarna.</p></div><span className="admin156-period">Senaste 30 dagarna</span></div>
              <div className="admin156-performance-grid">
                <article className="admin156-chart-card admin156-bars-card">
                  <div className="admin156-card-title"><h3>Genererade vs publicerade inlägg</h3><span><i className="generated"/> Genererade <i className="published"/> Publicerade</span></div>
                  <div className="admin156-bars">
                    {dailyBars.length ? dailyBars.map((row) => (
                      <div className="admin156-bar-group" key={row.date} title={`${row.date}: ${row.generated} genererade, ${row.published} publicerade`}>
                        <div className="admin156-bar generated" style={{ height: `${Math.max(4, Number(row.generated || 0) / row.max * 100)}%` }} />
                        <div className="admin156-bar published" style={{ height: `${Math.max(3, Number(row.published || 0) / row.max * 100)}%` }} />
                      </div>
                    )) : <div className="admin156-no-data">Ingen statistik ännu.</div>}
                  </div>
                </article>
                <article className="admin156-chart-card admin156-donut-card">
                  <h3>Innehållsformat</h3>
                  <div className="admin156-donut-wrap"><div className="admin156-donut" style={{ background: formatDonut.background }}><span><strong>{generated30d}</strong>inlägg</span></div>
                    <div className="admin156-donut-legend">{formatDonut.rows.map((row, index) => <div key={row.key}><i style={{ background: ["#7c3aed", "#9b75f5", "#b8a3ff", "#ff7455", "#f5b547", "#46c7a4"][index] }}/><span>{friendlyFormatName(row.name || row.key)}</span><b>{Math.round(Number(row.value || 0) / formatDonut.total * 100)}%</b></div>)}</div>
                  </div>
                </article>
                <article className="admin156-chart-card admin156-country-card">
                  <h3>Toppländer (kunder)</h3>
                  <div className="admin156-country-list">{(insights.topCountries || []).length ? insights.topCountries.slice(0, 6).map((row) => <div key={row.key}><span>{countryFlag(row.key)} {countryName(row.key)}</span><strong>{Number(row.value || 0)}</strong></div>) : <p>Ingen landstatistik ännu.</p>}</div>
                </article>
              </div>
            </section>

            <section className="admin156-section" id="kostnader">
              <div className="admin156-section-head"><div><h2>Faktiska kostnader per innehållstyp</h2><p>Kompletta USD-kostnader från de senaste 30 dagarna. Median är huvudmåttet eftersom enstaka dyra körningar annars kan dra upp snittet.</p></div><div className="admin156-cost-summary"><span>Median <strong>{formatUsd(generationCosts.medianUsd)}</strong></span><span>Snitt <strong>{formatUsd(generationCosts.averageUsd)}</strong></span><span>Underlag <strong>{generationCosts.samples || 0}</strong></span></div></div>
              <div className="admin156-cost-grid">
                {(generationCosts.formats || []).length ? generationCosts.formats.slice(0, 8).map((item) => (
                  <article className="admin156-cost-card" key={item.key}>
                    <div><h3>{friendlyFormatName(item.label || item.key)}</h3><span>{item.samples} kompletta körningar</span></div>
                    <dl><div><dt>Median</dt><dd>{formatUsd(item.medianUsd)}</dd></div><div><dt>Snitt</dt><dd>{formatUsd(item.averageUsd)}</dd></div><div><dt>P90</dt><dd>{formatUsd(item.p90Usd)}</dd></div></dl>
                  </article>
                )) : <div className="admin156-empty-wide">Ingen komplett kostnadsdata ännu. Nya körningar från v144.155 fyller på statistiken.</div>}
              </div>
            </section>

            <section className="admin156-bottom-grid">
              <article className="admin156-section admin156-adjustments">
                <div className="admin156-section-head compact"><div><h2>Senaste kreditjusteringar</h2></div><a href="/admin/credits">Visa alla</a></div>
                <div className="admin156-table-scroll"><table><thead><tr><th>Kund</th><th>Ändring</th><th>Nytt saldo</th><th>Orsak</th><th>Datum</th></tr></thead><tbody>{recentAdjustments.length ? recentAdjustments.slice(0, 5).map((item) => <tr key={item.id}><td>{item.target_email || "Okänt konto"}</td><td className={Number(item.amount) >= 0 ? "positive" : "negative"}>{Number(item.amount) > 0 ? "+" : ""}{Number(item.amount || 0)}</td><td>{Number(item.new_balance || 0).toLocaleString("sv-SE")}</td><td>{item.reason || "—"}</td><td>{formatDateTime(item.created_at, false)}</td></tr>) : <tr><td colSpan="5">Inga kreditjusteringar ännu.</td></tr>}</tbody></table></div>
              </article>

              <article className="admin156-section admin156-system-panel" id="systemstatus">
                <div className="admin156-section-head compact"><div><h2>Systemstatus</h2><p>{health.migrationRequired ? "Kör v144.156 SQL för historik. Live-status fungerar redan." : "Live-status och 30 dagars historik."}</p></div><button type="button" onClick={loadAdminData}>Uppdatera</button></div>
                <div className="admin156-system-list">{(health.systems || []).map((system) => <div key={system.key}><StatusDot status={system.status}/><span><strong>{system.label}</strong><small>{system.message || "—"}</small></span><em>{system.status === "up" ? "Online" : system.status === "unconfigured" ? "Ej konfig." : system.status === "degraded" ? "Störning" : "Nere"}</em><b>{Number(system.uptime30d ?? 100).toFixed(system.uptime30d < 99.95 ? 2 : 1)}%</b></div>)}</div>
                <div className="admin156-incidents"><h3>Senaste driftshistorik</h3>{(health.incidents || []).length ? health.incidents.slice(0, 5).map((incident) => <div key={incident.id}><span className={`admin156-incident-icon ${incident.resolved_at ? "resolved" : "open"}`}>{incident.resolved_at ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}</span><span><strong>{incident.label}</strong><small>{formatDateTime(incident.started_at)}{incident.resolved_at ? ` → ${formatDateTime(incident.resolved_at)}` : " · pågår"}</small></span></div>) : <p>Inga registrerade driftstörningar de senaste 30 dagarna.</p>}</div>
              </article>
            </section>

            <section className="admin156-section admin156-maintenance" id="translations">
              <div className="admin156-section-head"><div><h2>Systemverktyg</h2><p>Funktioner som fanns i tidigare adminpanel är kvar här så inget arbetsflöde försvinner.</p></div></div>
              <div className="admin156-maintenance-grid">
                <article>
                  <div className="admin156-maintenance-title"><Languages size={20}/><div><h3>Översättningar</h3><p>Välj språk som ska uppdateras vid nästa översättningskörning.</p></div></div>
                  <div className="admin156-language-grid">{translationLocales.map((item) => <button type="button" className={selectedLocales.includes(item.locale) ? "selected" : ""} key={item.locale} onClick={() => toggleLocale(item.locale)}><span>{selectedLocales.includes(item.locale) ? "✓" : ""}</span><strong>{item.nativeName}</strong></button>)}</div>
                  <button className="admin156-action-button" type="button" disabled={!selectedLocales.length || translationSaving} onClick={requestTranslationRefresh}>{translationSaving ? <LoaderCircle className="admin-spin" size={16}/> : <RefreshCw size={16}/>} Begär uppdatering</button>
                  {translationMessage ? <p className="admin156-message">{translationMessage}</p> : null}
                </article>
                <article>
                  <div className="admin156-maintenance-title"><AlertTriangle size={20}/><div><h3>OpenAI background-jobb</h3><p>{backgroundJobCount} spårade jobb är aktiva eller väntar.</p></div></div>
                  <button className="admin156-danger-button" type="button" onClick={stopOpenAIBackgroundJobs} disabled={backgroundStopping || backgroundJobCount === 0}>{backgroundStopping ? <LoaderCircle className="admin-spin" size={16}/> : <AlertTriangle size={16}/>} Stoppa pågående jobb</button>
                  {backgroundStopMessage ? <p className="admin156-message">{backgroundStopMessage}</p> : null}
                </article>
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
