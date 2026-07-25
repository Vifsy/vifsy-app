"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../lib/supabaseClient";

function getMonthRange(monthValue) {
  const [year, month] = String(monthValue || "").split("-").map(Number);
  const now = new Date();
  const safeYear = Number.isFinite(year) ? year : now.getFullYear();
  const safeMonth = Number.isFinite(month) ? month - 1 : now.getMonth();
  return {
    from: new Date(Date.UTC(safeYear, safeMonth, 1)).toISOString(),
    to: new Date(Date.UTC(safeYear, safeMonth + 1, 1)).toISOString(),
  };
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPercent(value) {
  return value === null || value === undefined ? "—" : `${Number(value).toLocaleString("sv-SE")} %`;
}

async function getAdminHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

const FILTERS = [
  ["all", "Alla kunder"],
  ["failed", "Misslyckade inlägg"],
  ["refunded", "Återförda krediter"],
  ["blocked", "Blockerade webbplatser"],
  ["reruns", "Oväntade omkörningar"],
];

function WarningPills({ customer }) {
  const pills = [];
  if (customer.blockedBrandCount) pills.push(["blocked", "Webbplats blockerad"]);
  if (customer.failedCount) pills.push(["failed", `${customer.failedCount} misslyckade`]);
  if (customer.refundedCredits) pills.push(["refunded", `${customer.refundedCredits} krediter återförda`]);
  if (customer.automaticReruns) pills.push(["rerun", `${customer.automaticReruns} omkörningar`]);
  if (!pills.length) pills.push(["ok", "Inga varningar"]);

  return (
    <div className="admin-v140-pill-row">
      {pills.map(([tone, text]) => <span className={`admin-v140-pill ${tone}`} key={`${tone}-${text}`}>{text}</span>)}
    </div>
  );
}

export default function AdminCustomersPage() {
  const [month, setMonth] = useState(currentMonthValue());
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [payload, setPayload] = useState({ customers: [], summary: {}, warnings: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const queryMonth = new URLSearchParams(window.location.search).get("month");
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) setMonth(queryMonth);
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [month, submittedSearch, filter]);

  async function loadCustomers() {
    setLoading(true);
    setError("");
    try {
      const headers = await getAdminHeaders();
      const range = getMonthRange(month);
      const params = new URLSearchParams({ ...range, search: submittedSearch, filter });
      const response = await fetch(`/api/admin/customers?${params.toString()}`, { headers });
      const nextPayload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(nextPayload?.error || "Kundlistan kunde inte läsas in.");
      setPayload(nextPayload);
    } catch (loadError) {
      setError(loadError.message || "Kundlistan kunde inte läsas in.");
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => [
    { label: "Kunder", value: payload.summary?.customerCount || 0, Icon: Users },
    { label: "Företag", value: payload.summary?.brandCount || 0, Icon: Building2 },
    { label: "Lyckade skapanden", value: payload.summary?.completedOccurrences || 0, Icon: CheckCircle2 },
    { label: "Misslyckade skapanden", value: payload.summary?.failedOccurrences || 0, Icon: AlertTriangle },
    { label: "Återförda krediter", value: payload.summary?.refundedCredits || 0, Icon: CircleDollarSign },
    { label: "Oväntade omkörningar", value: payload.summary?.unexpectedAutomaticReruns || 0, Icon: RotateCcw },
  ], [payload.summary]);

  return (
    <AppLayout active="admin">
      <div className="admin-page admin-v140-page">
        <a className="admin-back-link" href="/admin"><ArrowLeft size={16} /> Adminöversikt</a>

        <header className="admin-hero compact admin-v140-hero">
          <div>
            <span className="admin-eyebrow">Kunder och drift</span>
            <h1>Kundlista</h1>
            <p>Se varje kunds företag, krediter, skapade inlägg, återföringar, fel och tekniska varningar månad för månad.</p>
          </div>
          <div className="admin-v140-rate-card">
            <span>Lyckade skapanden</span>
            <strong>{formatPercent(payload.summary?.creationSuccessRate)}</strong>
            <small>för vald period</small>
          </div>
        </header>

        <section className="admin-panel admin-v140-controls">
          <form onSubmit={(event) => { event.preventDefault(); setSubmittedSearch(search.trim()); }}>
            <label>
              Månad
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
            <label className="admin-v140-search-label">
              Sök kund
              <span><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Namn, e-post eller abonnemang" /></span>
            </label>
            <button type="submit"><Search size={16} /> Sök</button>
            <button type="button" className="secondary" onClick={loadCustomers}><RefreshCw size={16} /> Uppdatera</button>
          </form>
          <div className="admin-v140-filter-row">
            {FILTERS.map(([value, label]) => (
              <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
        </section>

        {error ? <div className="admin-alert error admin-alert-with-action"><span>{error}</span><button type="button" onClick={loadCustomers}>Försök igen</button></div> : null}
        {payload.warnings?.length ? <div className="admin-alert warning"><AlertTriangle size={18} /><div><strong>Delvis statistik</strong><span>{payload.warnings.length} datakälla kunde inte läsas. Övrig information visas ändå.</span></div></div> : null}

        <section className="admin-stat-grid admin-v140-stat-grid">
          {stats.map(({ label, value, Icon }) => (
            <article className="admin-stat-card" key={label}><span className="admin-stat-icon"><Icon size={19} /></span><strong>{Number(value).toLocaleString("sv-SE")}</strong><span>{label}</span></article>
          ))}
        </section>

        <section className="admin-panel admin-v140-customer-panel">
          <div className="admin-panel-heading">
            <div><span className="admin-card-kicker">Vald period</span><h2>{payload.customers?.length || 0} kunder</h2></div>
            <span className="admin-v140-muted">Skapade inlägg: {Number(payload.summary?.createdPosts || 0).toLocaleString("sv-SE")} · Publicerade: {Number(payload.summary?.publishedPosts || 0).toLocaleString("sv-SE")}</span>
          </div>

          {loading ? (
            <div className="admin-empty-state"><LoaderCircle className="admin-spin" size={22} /> Läser in kundstatistik…</div>
          ) : payload.customers?.length ? (
            <div className="admin-v140-customer-list">
              <div className="admin-v140-customer-head"><span>Kund</span><span>Plan och krediter</span><span>Resultat</span><span>Varningar</span><span>Senast aktiv</span><span /></div>
              {payload.customers.map((customer) => (
                <a className="admin-v140-customer-row" href={`/admin/customers/${customer.id}?month=${month}`} key={customer.id}>
                  <div className="admin-v140-customer-name"><strong>{customer.name || customer.email || "Namnlös kund"}</strong><span>{customer.email || "—"}</span><small>{customer.brandCount} företag</small></div>
                  <div><strong>{customer.planName || "—"}</strong><span>{Number(customer.creditsRemaining || 0).toLocaleString("sv-SE")} krediter</span><small>{customer.subscriptionStatus || "—"}</small></div>
                  <div className="admin-v140-result-cell"><strong>{formatPercent(customer.successRate)}</strong><span>{customer.completedCount} lyckade · {customer.failedCount} misslyckade</span><small>{customer.publishedCount} publicerade</small></div>
                  <WarningPills customer={customer} />
                  <div><strong>{formatDate(customer.lastActivityAt)}</strong><span>Kund sedan {formatDate(customer.createdAt)}</span></div>
                  <ChevronRight size={20} aria-hidden="true" />
                </a>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state"><ShieldAlert size={22} /> Inga kunder matchar vald period och filtrering.</div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
