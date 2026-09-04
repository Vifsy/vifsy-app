"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  FileVideo2,
  FileCheck2,
  FlaskConical,
  ImagePlay,
  ImagePlus,
  LayoutGrid,
  Languages,
  LoaderCircle,
  Music2,
  RefreshCw,
  ShieldCheck,
  Shapes,
  Sparkles,
  Users,
} from "lucide-react";
import AppLayout from "../../components/AppLayout";
import { supabase } from "../../lib/supabaseClient";
import { useUiText } from "../../lib/i18n/useUiText";

const initialStats = {
  users: 0,
  brands: 0,
  posts: 0,
  activeAutomations: 0,
  backgrounds: 0,
  imageBackgrounds: 0,
  failedMedia: 0,
  pendingApproval: 0,
  completedOccurrences: 0,
  failedOccurrences: 0,
  refundedCredits: 0,
  unexpectedAutomaticReruns: 0,
};

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getAdminHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      }
    : { "Content-Type": "application/json" };
}

export default function AdminDashboardPage() {
  const { t } = useUiText(["admin"]);
  const [stats, setStats] = useState(initialStats);
  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [insights, setInsights] = useState({ periodDays: 30, topCustomersByCredits: [], topCustomersByPosts: [], topBrands: [], topFormats: [], platforms: [], totals: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [translationLocales, setTranslationLocales] = useState([]);
  const [translationStatuses, setTranslationStatuses] = useState({});
  const [selectedLocales, setSelectedLocales] = useState([]);
  const [translationLoading, setTranslationLoading] = useState(true);
  const [translationSaving, setTranslationSaving] = useState(false);
  const [translationMessage, setTranslationMessage] = useState("");
  const [backgroundJobCount, setBackgroundJobCount] = useState(0);
  const [backgroundStopping, setBackgroundStopping] = useState(false);
  const [backgroundStopMessage, setBackgroundStopMessage] = useState("");

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setTranslationLoading(true);
    setError("");

    try {
      const headers = await getAdminHeaders();
      const [overviewResponse, translationsResponse, backgroundJobsResponse] = await Promise.all([
        fetch("/api/admin/overview", { headers }),
        fetch("/api/admin/translations", { headers }),
        fetch("/api/admin/openai-background-jobs", { headers }),
      ]);
      const overviewPayload = await overviewResponse.json().catch(() => ({}));
      const translationsPayload = await translationsResponse.json().catch(() => ({}));
      const backgroundJobsPayload = await backgroundJobsResponse.json().catch(() => ({}));

      if (!overviewResponse.ok) {
        throw new Error(
          overviewPayload?.error || t("admin.errorLoadDashboard")
        );
      }

      setStats({ ...initialStats, ...(overviewPayload?.stats || {}) });
      setRecentAdjustments(overviewPayload?.recentAdjustments || []);
      setWarnings(overviewPayload?.warnings || []);
      setInsights(overviewPayload?.insights || { periodDays: 30, topCustomersByCredits: [], topCustomersByPosts: [], topBrands: [], topFormats: [], platforms: [], totals: {} });
      setBackgroundJobCount(
        backgroundJobsResponse.ok ? Number(backgroundJobsPayload?.counts?.total || 0) : 0
      );

      if (translationsResponse.ok) {
        setTranslationLocales(
          (translationsPayload?.locales || []).filter(
            (item) => item.locale !== translationsPayload?.defaultLocale
          )
        );
        setTranslationStatuses(translationsPayload?.statuses || {});
      } else {
        setWarnings((current) => [
          ...current,
          {
            key: "translations",
            message:
              translationsPayload?.error || t("admin.translationStatusError"),
          },
        ]);
      }
    } catch (loadError) {
      setError(loadError.message || t("admin.errorLoadDashboard"));
    } finally {
      setLoading(false);
      setTranslationLoading(false);
    }
  }

  function toggleLocale(locale) {
    setSelectedLocales((current) =>
      current.includes(locale)
        ? current.filter((item) => item !== locale)
        : [...current, locale]
    );
  }

  async function requestTranslationRefresh() {
    if (!selectedLocales.length) {
      setTranslationMessage(t("admin.translationChooseLanguage"));
      return;
    }

    setTranslationSaving(true);
    setTranslationMessage("");

    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/translations", {
        method: "POST",
        headers,
        body: JSON.stringify({ locales: selectedLocales }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || t("admin.translationRefreshError"));
      }

      const now = new Date().toISOString();
      setTranslationStatuses((current) => {
        const next = { ...current };
        selectedLocales.forEach((locale) => {
          next[locale] = [
            {
              namespace: "all",
              status: "refresh_requested",
              updatedAt: now,
            },
          ];
        });
        return next;
      });
      setTranslationMessage(
        t("admin.translationRefreshQueued", { count: selectedLocales.length })
      );
      setSelectedLocales([]);
    } catch (saveError) {
      setTranslationMessage(
        saveError.message || t("admin.translationRefreshError")
      );
    } finally {
      setTranslationSaving(false);
    }
  }

  async function stopOpenAIBackgroundJobs() {
    const confirmed = window.confirm(
      "Stoppa alla pågående OpenAI-bakgrundsjobb som Spreelo spårar? Berörda jobb får 15 minuters cooldown innan de kan försöka igen."
    );
    if (!confirmed) return;

    setBackgroundStopping(true);
    setBackgroundStopMessage("");
    try {
      const headers = await getAdminHeaders();
      const response = await fetch("/api/admin/openai-background-jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({ confirm: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Kunde inte stoppa OpenAI-bakgrundsjobben.");
      }
      const stopped = Number(payload?.campaignCancelled || 0) + Number(payload?.brandCancelled || 0);
      setBackgroundJobCount(0);
      setBackgroundStopMessage(
        `Nödstopp klart. ${stopped} pågående OpenAI-jobb avbröts. Berörda jobb väntar till ${formatDateTime(payload?.cooldownUntil)} innan nytt försök.`
      );
    } catch (stopError) {
      setBackgroundStopMessage(stopError?.message || "Kunde inte stoppa OpenAI-bakgrundsjobben.");
    } finally {
      setBackgroundStopping(false);
    }
  }

  const requestedLocaleCount = useMemo(
    () =>
      Object.values(translationStatuses).filter((packs) =>
        (packs || []).some((pack) => pack.status === "refresh_requested")
      ).length,
    [translationStatuses]
  );

  const statCards = [
    { label: t("admin.dashboard.accounts"), value: stats.users, Icon: Users },
    { label: t("admin.dashboard.brands"), value: stats.brands, Icon: Building2 },
    { label: t("admin.dashboard.posts"), value: stats.posts, Icon: Sparkles },
    { label: t("admin.dashboard.activeAutomations"), value: stats.activeAutomations, Icon: Bot },
    { label: t("admin.dashboard.videoBackgrounds"), value: stats.backgrounds, Icon: ImagePlay },
    { label: t("admin.dashboard.imageBackgrounds"), value: stats.imageBackgrounds, Icon: ImagePlus },
    { label: t("admin.dashboard.pendingApproval"), value: stats.pendingApproval, Icon: FileVideo2 },
    { label: t("admin.dashboard.completedMonth"), value: stats.completedOccurrences, Icon: CheckCircle2 },
    { label: t("admin.dashboard.failedMonth"), value: stats.failedOccurrences, Icon: AlertTriangle },
    { label: t("admin.dashboard.refundedCredits"), value: stats.refundedCredits, Icon: CircleDollarSign },
    { label: t("admin.dashboard.unexpectedReruns"), value: stats.unexpectedAutomaticReruns, Icon: RefreshCw },
  ];

  return (
    <AppLayout active="admin">
      <div className="admin-page">
        <header className="admin-hero">
          <div>
            <span className="admin-eyebrow">{t("admin.dashboard.kicker")}</span>
            <h1>{t("admin.dashboard.title")}</h1>
            <p>{t("admin.dashboard.description")}</p>
          </div>

          <div className="admin-hero-badge">
            <ShieldCheck size={24} aria-hidden="true" />
            <div>
              <strong>{t("admin.dashboard.administrator")}</strong>
              <span>{t("admin.dashboard.protectedAccess")}</span>
            </div>
          </div>
        </header>

        {error ? (
          <div className="admin-alert error admin-alert-with-action">
            <span>{error}</span>
            <button type="button" onClick={loadAdminData}>
              <RefreshCw size={15} aria-hidden="true" />
              {t("admin.retry")}
            </button>
          </div>
        ) : null}

        {!error && warnings.length ? (
          <div className="admin-alert warning">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>{t("admin.partialOverviewTitle")}</strong>
              <span>{t("admin.partialOverviewText")}</span>
              <small>{t("admin.partialOverviewDetails", { count: warnings.length })}</small>
            </div>
          </div>
        ) : null}

        {!loading && (backgroundJobCount > 0 || backgroundStopMessage) ? (
          <div className="admin-alert warning admin-alert-with-action">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>OpenAI-bakgrundsjobb</strong>
              <span>
                {backgroundJobCount > 0
                  ? `${backgroundJobCount} spårade background-jobb är aktiva eller väntar.`
                  : backgroundStopMessage || "Inga spårade background-jobb är aktiva."}
              </span>
              {backgroundStopMessage && backgroundJobCount > 0 ? <small>{backgroundStopMessage}</small> : null}
            </div>
            {backgroundJobCount > 0 ? (
              <button type="button" onClick={stopOpenAIBackgroundJobs} disabled={backgroundStopping}>
                {backgroundStopping ? (
                  <LoaderCircle className="admin-spin" size={15} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={15} aria-hidden="true" />
                )}
                {backgroundStopping ? "Stoppar…" : "Stoppa pågående jobb"}
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <section className="admin-loading-card">
            <LoaderCircle className="admin-spin" size={24} aria-hidden="true" />
            {t("admin.dashboard.loading")}
          </section>
        ) : (
          <>
            <section className="admin-stat-grid">
              {statCards.map(({ label, value, Icon }) => (
                <article className="admin-stat-card" key={label}>
                  <span className="admin-stat-icon"><Icon size={20} aria-hidden="true" /></span>
                  <strong>{Number(value || 0).toLocaleString()}</strong>
                  <span>{label}</span>
                </article>
              ))}
            </section>

            {stats.failedMedia > 0 ? (
              <div className="admin-alert warning">
                <AlertTriangle size={19} aria-hidden="true" />
                <div>
                  <strong>{t("admin.failedJobsTitle", { count: stats.failedMedia })}</strong>
                  <span>{t("admin.failedJobsText")}</span>
                </div>
              </div>
            ) : null}

            <section className="admin-tool-grid">
              <a className="admin-tool-card" href="/admin/customers">
                <span className="admin-tool-icon"><Users size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.dashboard.customersKicker")}</span>
                  <h2>{t("admin.dashboard.customersTitle")}</h2>
                  <p>{t("admin.dashboard.customersText")}</p>
                </div>
                <strong>{t("admin.dashboard.openCustomers")} →</strong>
              </a>

              <a className="admin-tool-card" href="/video-backgrounds">
                <span className="admin-tool-icon"><ImagePlay size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.dashboard.libraryKicker")}</span>
                  <h2>{t("admin.dashboard.videoBackgrounds")}</h2>
                  <p>{t("admin.dashboard.videoText")}</p>
                </div>
                <strong>{t("admin.dashboard.openLibrary")} →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/image-backgrounds">
                <span className="admin-tool-icon"><ImagePlus size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.dashboard.libraryKicker")}</span>
                  <h2>{t("admin.dashboard.imageBackgrounds")}</h2>
                  <p>{t("admin.dashboard.imageText")}</p>
                </div>
                <strong>{t("admin.dashboard.openLibrary")} →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/music-library">
                <span className="admin-tool-icon"><Music2 size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.dashboard.libraryKicker")}</span>
                  <h2>{t("admin.dashboard.musicLibrary")}</h2>
                  <p>{t("admin.dashboard.musicText")}</p>
                </div>
                <strong>{t("admin.dashboard.openLibrary")} →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/credits">
                <span className="admin-tool-icon"><CircleDollarSign size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.dashboard.supportKicker")}</span>
                  <h2>{t("admin.dashboard.creditsTitle")}</h2>
                  <p>{t("admin.dashboard.creditsText")}</p>
                </div>
                <strong>{t("admin.dashboard.manageCredits")} →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/content-credits">
                <span className="admin-tool-icon"><Coins size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.contentCredits.kicker")}</span>
                  <h2>{t("admin.contentCredits.title")}</h2>
                  <p>{t("admin.contentCredits.dashboardDescription")}</p>
                </div>
                <strong>{t("admin.contentCredits.open")} →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/content-formats">
                <span className="admin-tool-icon"><LayoutGrid size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.formats.kicker")}</span>
                  <h2>{t("admin.formats.title")}</h2>
                  <p>{t("admin.formats.dashboardDescription")}</p>
                </div>
                <strong>{t("admin.formats.manage")} →</strong>
              </a>


              <a className="admin-tool-card" href="/admin/icons">
                <span className="admin-tool-icon"><Shapes size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.icons.kicker")}</span>
                  <h2>{t("admin.icons.title")}</h2>
                  <p>{t("admin.icons.description")}</p>
                </div>
                <strong>{t("admin.icons.manage")} →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/mass-tests">
                <span className="admin-tool-icon"><FlaskConical size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">ADMIN · TEST</span>
                  <h2>Masstest</h2>
                  <p>Kör riktiga AI-inlägg och kalenderkampanjer för flera varumärken samtidigt, utan att dra kundkrediter.</p>
                </div>
                <strong>Öppna masstest →</strong>
              </a>

              <a className="admin-tool-card" href="/admin/post-approvals">
                <span className="admin-tool-icon"><FileCheck2 size={24} aria-hidden="true" /></span>
                <div>
                  <span className="admin-card-kicker">{t("admin.approvals.kicker")}</span>
                  <h2>{t("admin.approvals.title")}</h2>
                  <p>{t("admin.approvals.description")}</p>
                </div>
                <strong>{t("admin.approvals.open")} →</strong>
              </a>
            </section>

            <section className="admin-panel admin-insights-panel">
              <div className="admin-panel-heading admin-insights-heading">
                <div>
                  <span className="admin-card-kicker">{t("admin.insights.kicker")}</span>
                  <h2>{t("admin.insights.title")}</h2>
                  <p>{t("admin.insights.description")}</p>
                </div>
                <span className="admin-insights-period">30D</span>
              </div>

              <div className="admin-insight-metrics">
                <article><span>{t("admin.insights.postsCreated")}</span><strong>{Number(insights?.totals?.postsCreated || 0).toLocaleString()}</strong></article>
                <article><span>{t("admin.insights.published")}</span><strong>{Number(insights?.totals?.postsPublished || 0).toLocaleString()}</strong></article>
                <article><span>{t("admin.insights.successRate")}</span><strong>{Math.round(Number(insights?.totals?.successRate ?? 1) * 100)}%</strong></article>
                <article><span>{t("admin.insights.refunded")}</span><strong>{Number(insights?.totals?.creditsRefunded || 0).toLocaleString()}</strong></article>
              </div>

              <div className="admin-insight-grid">
                {[
                  [t("admin.insights.topCredits"), insights?.topCustomersByCredits || [], t("admin.insights.credits"), true],
                  [t("admin.insights.topPosts"), insights?.topCustomersByPosts || [], t("admin.insights.posts"), true],
                  [t("admin.insights.topBrands"), insights?.topBrands || [], t("admin.insights.posts"), false],
                  [t("admin.insights.topFormats"), insights?.topFormats || [], t("admin.insights.posts"), false],
                  [t("admin.insights.platformMix"), insights?.platforms || [], t("admin.insights.posts"), false],
                ].map(([title, rows, unit, customerLinks]) => (
                  <article className="admin-insight-card" key={title}>
                    <h3>{title}</h3>
                    {rows.length ? <div className="admin-insight-list">{rows.slice(0, 5).map((row, index) => (
                      <a key={`${title}-${row.key}`} href={customerLinks && row.userId ? `/admin/customers/${row.userId}` : "#"} onClick={(event) => { if (!(customerLinks && row.userId)) event.preventDefault(); }}>
                        <span className="admin-insight-rank">{index + 1}</span>
                        <span className="admin-insight-name"><strong>{row.name || row.key}</strong>{row.email ? <small>{row.email}</small> : null}</span>
                        <b>{Number(row.value || 0).toLocaleString()} <small>{unit}</small></b>
                      </a>
                    ))}</div> : <p className="admin-insight-empty">{t("admin.insights.noData")}</p>}
                  </article>
                ))}
              </div>
            </section>

            <section className="admin-panel admin-translation-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-card-kicker">{t("admin.translationKicker")}</span>
                  <h2>{t("admin.translationTitle")}</h2>
                  <p>{t("admin.translationDescription")}</p>
                </div>
                <span className="admin-translation-status">
                  <Languages size={18} aria-hidden="true" />
                  {t("admin.translationPendingCount", { count: requestedLocaleCount })}
                </span>
              </div>

              {translationLoading ? (
                <div className="admin-inline-loading">
                  <LoaderCircle className="admin-spin" size={18} aria-hidden="true" />
                  {t("admin.translationLoading")}
                </div>
              ) : (
                <>
                  <div className="admin-language-grid">
                    {translationLocales.map((item) => {
                      const packs = translationStatuses[item.locale] || [];
                      const refreshRequested = packs.some(
                        (pack) => pack.status === "refresh_requested"
                      );
                      const selected = selectedLocales.includes(item.locale);

                      return (
                        <button
                          type="button"
                          key={item.locale}
                          className={`admin-language-option${selected ? " selected" : ""}`}
                          onClick={() => toggleLocale(item.locale)}
                          aria-pressed={selected}
                        >
                          <span className="admin-language-checkbox">
                            {selected ? <CheckCircle2 size={17} aria-hidden="true" /> : null}
                          </span>
                          <span>
                            <strong>{item.nativeName}</strong>
                            <small>{item.language}</small>
                          </span>
                          {refreshRequested ? (
                            <em>{t("admin.translationQueued")}</em>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="admin-translation-actions">
                    <p>{t("admin.translationNextVisitNote")}</p>
                    <button
                      type="button"
                      className="admin-primary-button"
                      onClick={requestTranslationRefresh}
                      disabled={translationSaving || !selectedLocales.length}
                    >
                      {translationSaving ? (
                        <LoaderCircle className="admin-spin" size={17} aria-hidden="true" />
                      ) : (
                        <RefreshCw size={17} aria-hidden="true" />
                      )}
                      {translationSaving
                        ? t("admin.translationRequesting")
                        : t("admin.translationRequest")}
                    </button>
                  </div>
                </>
              )}

              {translationMessage ? (
                <div className="admin-translation-message">{translationMessage}</div>
              ) : null}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <span className="admin-card-kicker">{t("admin.dashboard.auditKicker")}</span>
                  <h2>{t("admin.dashboard.recentAdjustments")}</h2>
                </div>
                <a href="/admin/credits">{t("admin.dashboard.viewAll")}</a>
              </div>

              {recentAdjustments.length ? (
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>{t("admin.dashboard.account")}</th>
                        <th>{t("admin.dashboard.change")}</th>
                        <th>{t("admin.dashboard.newBalance")}</th>
                        <th>{t("admin.dashboard.reason")}</th>
                        <th>{t("admin.dashboard.date")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentAdjustments.map((item) => (
                        <tr key={item.id}>
                          <td>{item.target_email || "Unknown account"}</td>
                          <td className={Number(item.amount) >= 0 ? "positive" : "negative"}>
                            {Number(item.amount) > 0 ? "+" : ""}{Number(item.amount || 0)}
                          </td>
                          <td>{Number(item.new_balance || 0)}</td>
                          <td>{item.reason}</td>
                          <td>{formatDateTime(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty-state">{t("admin.dashboard.noAdjustments")}</div>
              )}
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
