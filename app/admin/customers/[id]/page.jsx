"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  Globe2,
  LoaderCircle,
  Mail,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import AppLayout from "../../../../components/AppLayout";
import { supabase } from "../../../../lib/supabaseClient";

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthRange(value) {
  const [year, month] = String(value || currentMonthValue()).split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    to: new Date(Date.UTC(year, month, 1)).toISOString(),
  };
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatDuration(value) {
  const ms = Math.max(0, Number(value || 0));
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} s`;
  return `${(ms / 60000).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} min`;
}

function safeText(value, fallback = "—") {
  const text = String(value || "").trim();
  return text || fallback;
}

async function getAdminHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

const TABS = [
  ["overview", "Översikt"],
  ["brands", "Företag"],
  ["posts", "Inlägg"],
  ["credits", "Krediter"],
  ["failures", "Fel och återföringar"],
  ["technical", "Teknik"],
];

function Status({ value }) {
  const normalized = String(value || "unknown").toLowerCase();
  const tone = normalized.includes("complete") || normalized === "published" || normalized === "sent" || normalized === "accessible"
    ? "ok"
    : normalized.includes("fail") || normalized.includes("blocked") || normalized === "error"
      ? "danger"
      : normalized.includes("running") || normalized.includes("pending") || normalized.includes("reserved")
        ? "warning"
        : "neutral";
  return <span className={`admin-v140-status ${tone}`}>{safeText(value)}</span>;
}

function Empty({ children }) {
  return <div className="admin-empty-state">{children}</div>;
}

export default function AdminCustomerCardPage({ params }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams?.id;
  const [month, setMonth] = useState(currentMonthValue());
  const [tab, setTab] = useState("overview");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const queryMonth = new URLSearchParams(window.location.search).get("month");
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) setMonth(queryMonth);
  }, []);

  useEffect(() => {
    if (customerId) loadCustomer();
  }, [customerId, month]);

  async function loadCustomer() {
    setLoading(true);
    setError("");
    try {
      const headers = await getAdminHeaders();
      const range = getMonthRange(month);
      const paramsString = new URLSearchParams(range).toString();
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(customerId)}?${paramsString}`, { headers });
      const nextPayload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(nextPayload?.error || "Kundkortet kunde inte läsas in.");
      setPayload(nextPayload);
    } catch (loadError) {
      setError(loadError.message || "Kundkortet kunde inte läsas in.");
    } finally {
      setLoading(false);
    }
  }

  const brandById = useMemo(() => new Map((payload?.brands || []).map((brand) => [brand.id, brand])), [payload?.brands]);
  const ruleById = useMemo(() => new Map((payload?.rules || []).map((rule) => [rule.id, rule])), [payload?.rules]);
  const summary = payload?.summary || {};
  const customer = payload?.customer || {};
  const balance = customer.balance || {};
  const failures = (payload?.occurrences || []).filter((row) => row.status === "failed_terminal");

  const stats = [
    ["Företag", summary.brandCount || 0, Building2],
    ["Skapade inlägg", summary.postsCreated || 0, FileText],
    ["Lyckade körningar", summary.completedOccurrences || 0, CheckCircle2],
    ["Misslyckade", summary.failedOccurrences || 0, AlertTriangle],
    ["Återförda krediter", summary.refundedCredits || 0, CircleDollarSign],
    ["Omkörningar", summary.unexpectedAutomaticReruns || 0, RotateCcw],
  ];

  return (
    <AppLayout active="admin">
      <div className="admin-page admin-v140-page">
        <a className="admin-back-link" href={`/admin/customers?month=${month}`}><ArrowLeft size={16} /> Kundlistan</a>

        {loading && !payload ? <section className="admin-loading-card"><LoaderCircle className="admin-spin" size={24} /> Läser in kundkort…</section> : null}
        {error ? <div className="admin-alert error admin-alert-with-action"><span>{error}</span><button type="button" onClick={loadCustomer}>Försök igen</button></div> : null}

        {payload ? (
          <>
            <header className="admin-hero compact admin-v140-customer-hero">
              <div>
                <span className="admin-eyebrow">Kundkort</span>
                <h1>{customer.name || customer.email || "Namnlös kund"}</h1>
                <p>{customer.email || "—"} · Kund sedan {formatDate(customer.createdAt)}</p>
                <div className="admin-v140-pill-row">
                  <Status value={balance.subscription_status || "okänd abonnemangsstatus"} />
                  {summary.blockedBrandCount ? <span className="admin-v140-pill blocked">{summary.blockedBrandCount} blockerade webbplatser</span> : <span className="admin-v140-pill ok">Webbåtkomst utan aktuell varning</span>}
                  {summary.unexpectedAutomaticReruns ? <span className="admin-v140-pill rerun">Oväntad omkörning upptäckt</span> : <span className="admin-v140-pill ok">0 automatiska omkörningar</span>}
                </div>
              </div>
              <div className="admin-v140-customer-balance">
                <span>Tillgängliga krediter</span>
                <strong>{Number(balance.credits_remaining || 0).toLocaleString("sv-SE")}</strong>
                <small>{safeText(balance.subscription_plan || balance.plan_name)} · månadsgräns {Number(balance.monthly_credit_limit || 0).toLocaleString("sv-SE")}</small>
              </div>
            </header>

            {payload.warnings?.length ? <div className="admin-alert warning"><AlertTriangle size={18} /><div><strong>Delvis kundkort</strong><span>{payload.warnings.length} datakälla kunde inte läsas. Övriga uppgifter visas ändå.</span></div></div> : null}

            <section className="admin-v140-toolbar">
              <label>Månad <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
              <button type="button" onClick={loadCustomer}><RefreshCw size={16} /> Uppdatera</button>
              <a href={`/admin/credits?email=${encodeURIComponent(customer.email || "")}`}><CircleDollarSign size={16} /> Justera krediter</a>
            </section>

            <section className="admin-stat-grid admin-v140-stat-grid">
              {stats.map(([label, value, Icon]) => <article className="admin-stat-card" key={label}><span className="admin-stat-icon"><Icon size={19} /></span><strong>{Number(value).toLocaleString("sv-SE")}</strong><span>{label}</span></article>)}
            </section>

            <nav className="admin-v140-tabs" aria-label="Kundkortets delar">
              {TABS.map(([value, label]) => <button type="button" className={tab === value ? "active" : ""} onClick={() => setTab(value)} key={value}>{label}</button>)}
            </nav>

            {tab === "overview" ? (
              <div className="admin-v140-two-column">
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Resultat vald månad</span><h2>Skapande och publicering</h2></div></div>
                  <dl className="admin-v140-metric-list">
                    <div><dt>Lyckad skapandefrekvens</dt><dd>{summary.creationSuccessRate === null ? "—" : `${summary.creationSuccessRate} %`}</dd></div>
                    <div><dt>Publicerade inlägg</dt><dd>{summary.publishedPosts || 0}</dd></div>
                    <div><dt>Publiceringsfel</dt><dd>{summary.publishFailed || 0}</dd></div>
                    <div><dt>Aktiva planer</dt><dd>{summary.activeAutomationCount || 0}</dd></div>
                    <div><dt>Pausade planer</dt><dd>{summary.pausedAutomationCount || 0}</dd></div>
                    <div><dt>Pågående körningar</dt><dd>{summary.runningOccurrences || 0}</dd></div>
                  </dl>
                </section>
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Konto</span><h2>Kunduppgifter</h2></div></div>
                  <dl className="admin-v140-detail-list">
                    <div><dt>E-post</dt><dd>{customer.email || "—"}</dd></div>
                    <div><dt>Telefon</dt><dd>{customer.phone || "—"}</dd></div>
                    <div><dt>Senaste inloggning</dt><dd>{formatDate(customer.lastSignInAt)}</dd></div>
                    <div><dt>Inloggningsleverantör</dt><dd>{customer.appMetadata?.provider || "—"}</dd></div>
                    <div><dt>Kund-ID</dt><dd className="admin-mono">{customer.id}</dd></div>
                  </dl>
                </section>
                <section className="admin-panel admin-v140-wide-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Senaste händelser</span><h2>Automatiska körningar</h2></div></div>
                  {(payload.occurrences || []).length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tid</th><th>Företag</th><th>Plan</th><th>Status</th><th>Krediter</th><th>Meddelande</th></tr></thead><tbody>{payload.occurrences.slice(0, 12).map((row) => <tr key={row.id}><td>{formatDate(row.started_at)}</td><td>{brandById.get(row.brand_profile_id)?.business_name || "—"}</td><td>{ruleById.get(row.automation_rule_id)?.name || row.rule_name || "—"}</td><td><Status value={row.status} /></td><td>{row.refunded_credits ? `+${row.refunded_credits} återförda` : "—"}</td><td>{row.failure_customer_message || "—"}</td></tr>)}</tbody></table></div> : <Empty>Ingen körningshistorik för perioden.</Empty>}
                </section>
              </div>
            ) : null}

            {tab === "brands" ? (
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="admin-card-kicker">{payload.brands.length} företag</span><h2>Kundens företag</h2></div></div>
                {payload.brands.length ? <div className="admin-v140-brand-grid">{payload.brands.map((brand) => <article key={brand.id}><header><span className="admin-v140-brand-icon"><Building2 size={19} /></span><div><h3>{brand.business_name || "Namnlöst företag"}</h3><p>{brand.website_url || "Ingen webbplats"}</p></div><Status value={brand.website_access_status || "okänd"} /></header><dl><div><dt>Bransch</dt><dd>{brand.industry || "—"}</dd></div><div><dt>Marknad</dt><dd>{brand.content_market || brand.country_code || "—"}</dd></div><div><dt>Språk</dt><dd>{brand.content_language || "—"}</dd></div><div><dt>Produktsida</dt><dd>{brand.website_product_source_url || "—"}</dd></div><div><dt>Säkerhetssystem</dt><dd>{brand.website_security_provider || "—"}</dd></div><div><dt>Senast kontrollerad</dt><dd>{formatDate(brand.website_access_checked_at)}</dd></div></dl>{brand.website_access_message ? <p className="admin-v140-brand-message">{brand.website_access_message}</p> : null}</article>)}</div> : <Empty>Kunden har inga företag registrerade.</Empty>}
              </section>
            ) : null}

            {tab === "posts" ? (
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="admin-card-kicker">Vald månad</span><h2>Inläggshistorik</h2></div></div>
                {payload.posts.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Datum</th><th>Företag</th><th>Format</th><th>Plattform</th><th>Skapandestatus</th><th>Publicering</th><th>Modeller</th></tr></thead><tbody>{payload.posts.map((post) => <tr key={post.id}><td>{formatDate(post.scheduled_for || post.created_at)}</td><td>{brandById.get(post.brand_profile_id)?.business_name || "—"}</td><td>{post.content_format || post.post_type || "—"}</td><td>{post.platform || "—"}</td><td><Status value={post.status} /></td><td>{post.published_at ? formatDate(post.published_at) : post.last_publish_error ? `Fel: ${post.last_publish_error}` : "—"}</td><td>{[post.text_model_used, post.image_model_used, post.product_research_model_used].filter(Boolean).join(", ") || "—"}</td></tr>)}</tbody></table></div> : <Empty>Inga inlägg skapades under perioden.</Empty>}
              </section>
            ) : null}

            {tab === "credits" ? (
              <section className="admin-panel">
                <div className="admin-panel-heading"><div><span className="admin-card-kicker">Oföränderlig historik</span><h2>Kreditbok</h2></div><a href={`/admin/credits?email=${encodeURIComponent(customer.email || "")}`}>Manuell justering</a></div>
                {payload.creditLedger.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Datum</th><th>Händelse</th><th>Källa</th><th>Förändring</th><th>Anledning</th><th>Plan</th></tr></thead><tbody>{payload.creditLedger.map((row) => <tr key={`${row.source}-${row.id}`}><td>{formatDate(row.created_at)}</td><td>{row.event_type || "—"}</td><td>{row.source}</td><td className={Number(row.amount) >= 0 ? "positive" : "negative"}>{Number(row.amount) > 0 ? "+" : ""}{Number(row.amount || 0)}</td><td>{row.reason || "—"}</td><td>{ruleById.get(row.automation_rule_id)?.name || "—"}</td></tr>)}</tbody></table></div> : <Empty>Ingen kredithistorik för perioden.</Empty>}
              </section>
            ) : null}

            {tab === "failures" ? (
              <div className="admin-v140-two-column">
                <section className="admin-panel admin-v140-wide-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">{failures.length} misslyckanden</span><h2>Fel och kreditåterföringar</h2></div></div>
                  {failures.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Tid</th><th>Företag</th><th>Format</th><th>Feltyp</th><th>Kundmeddelande</th><th>Återfört</th><th>Mejl</th></tr></thead><tbody>{failures.map((row) => <tr key={row.id}><td>{formatDate(row.started_at)}</td><td>{brandById.get(row.brand_profile_id)?.business_name || "—"}</td><td>{row.content_format || ruleById.get(row.automation_rule_id)?.content_type_label || "—"}</td><td><Status value={row.failure_code || "unknown"} /></td><td>{row.failure_customer_message || "—"}</td><td>{Number(row.refunded_credits || 0)}</td><td><Status value={row.notification_status || "not_sent"} /></td></tr>)}</tbody></table></div> : <Empty>Inga misslyckade skapanden under perioden.</Empty>}
                </section>
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Fördelning</span><h2>Vanligaste felorsaker</h2></div></div>
                  {Object.keys(summary.failureReasons || {}).length ? <div className="admin-v140-reason-list">{Object.entries(summary.failureReasons).sort((a,b)=>b[1]-a[1]).map(([reason,count]) => <div key={reason}><span>{reason}</span><strong>{count}</strong></div>)}</div> : <Empty>Inga felorsaker att summera.</Empty>}
                </section>
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Kundkommunikation</span><h2>Skickade meddelanden</h2></div></div>
                  {(payload.notifications || []).length ? <div className="admin-v140-notification-list">{payload.notifications.slice(0,20).map((row) => <article key={row.id}><Mail size={17}/><div><strong>{row.subject || row.notification_type || "Kundmeddelande"}</strong><span>{formatDate(row.sent_at || row.created_at)}</span><p>{row.error_message || row.recipient || "—"}</p></div><Status value={row.status} /></article>)}</div> : <Empty>Inga kundmeddelanden registrerade.</Empty>}
                </section>
              </div>
            ) : null}

            {tab === "technical" ? (
              <div className="admin-v140-two-column">
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Kostnad och användning</span><h2>Teknisk summering</h2></div></div>
                  <dl className="admin-v140-metric-list"><div><dt>Samlad körtid</dt><dd>{formatDuration(payload.technical.totalRunDurationMs)}</dd></div><div><dt>Valda produkter</dt><dd>{payload.technical.totalProductsSelected || 0}</dd></div><div><dt>AI-kostnad</dt><dd>{payload.technical.exactAiCostAvailable ? "Tillgänglig" : "Registreras inte exakt ännu"}</dd></div><div><dt>Automatiska omkörningar</dt><dd>{summary.unexpectedAutomaticReruns || 0}</dd></div></dl>
                </section>
                <section className="admin-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Modeller</span><h2>Använda AI-modeller</h2></div></div>
                  {payload.technical.modelsUsed.length ? <div className="admin-v140-model-list">{payload.technical.modelsUsed.map((model) => <span key={model}>{model}</span>)}</div> : <Empty>Ingen modelldata registrerad för perioden.</Empty>}
                </section>
                <section className="admin-panel admin-v140-wide-panel">
                  <div className="admin-panel-heading"><div><span className="admin-card-kicker">Driftlogg</span><h2>Automationskörningar</h2></div></div>
                  {payload.runLogs.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Start</th><th>Företag</th><th>Plan</th><th>Status</th><th>Körtid</th><th>Produkter</th><th>Sökmetoder</th><th>Fel</th></tr></thead><tbody>{payload.runLogs.map((row) => <tr key={row.id}><td>{formatDate(row.started_at)}</td><td>{row.brand_name || brandById.get(row.brand_profile_id)?.business_name || "—"}</td><td>{row.rule_name || row.campaign_title || "—"}</td><td><Status value={row.status} /></td><td>{formatDuration(row.duration_ms)}</td><td>{row.products_selected || 0}</td><td>{Array.isArray(row.search_methods) ? row.search_methods.join(", ") : row.search_methods || "—"}</td><td>{row.error_message || row.failure_customer_message || "—"}</td></tr>)}</tbody></table></div> : <Empty>Inga tekniska körningsloggar för perioden.</Empty>}
                </section>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
