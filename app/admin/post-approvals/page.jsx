"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Video,
  X,
  XCircle,
} from "lucide-react";
import AppLayout from "../../../components/AppLayout";
import { supabase } from "../../../lib/supabaseClient";
import { useUiText } from "../../../lib/i18n/useUiText";

async function getHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusMeta(status, t) {
  if (status === "approved") return { label: t("admin.approvals.approved"), className: "approved", Icon: CheckCircle2 };
  if (status === "rejected") return { label: t("admin.approvals.rejected"), className: "rejected", Icon: XCircle };
  return { label: t("admin.approvals.pending"), className: "pending", Icon: Clock3 };
}

function MediaPreview({ post, t }) {
  if (post.video_url) {
    return (
      <div className="admin-v74-media-frame">
        <video src={post.video_url} controls playsInline preload="metadata" />
      </div>
    );
  }
  if (post.image_url) {
    return (
      <div className="admin-v74-media-frame">
        <img src={post.image_url} alt="" />
      </div>
    );
  }
  if (post.slides?.length) {
    return (
      <div className="admin-v74-slide-grid">
        {post.slides.map((slide) => (
          <article key={`${post.id}-${slide.slide_order}`}>
            {slide.image_url ? <img src={slide.image_url} alt="" /> : <span><ImageIcon size={22} /></span>}
            {post.content_format !== "carousel" ? (
              <div>
                <strong>{slide.headline || `Slide ${slide.slide_order}`}</strong>
                {slide.body ? <p>{slide.body}</p> : null}
                {slide.cta_text ? <small>{slide.cta_text}</small> : null}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    );
  }
  return <div className="admin-v74-no-media"><ImageIcon size={22} />{t("admin.approvals.noMedia")}</div>;
}

export default function AdminPostApprovalsPage() {
  const { t } = useUiText(["admin"]);
  const [filter, setFilter] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [drafts, setDrafts] = useState({});
  const [selectedPostId, setSelectedPostId] = useState("");
  const [settings, setSettings] = useState({
    available: false,
    enabled: false,
    reviewRecipient: "",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [actionDraft, setActionDraft] = useState({
    admin_note: "",
    product_urls: "",
  });
  const [notice, setNotice] = useState("");

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  useEffect(() => { loadPosts(); }, [filter]);
  useEffect(() => {
    if (!selectedPostId) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setSelectedPostId(""); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPostId]);

  async function loadPosts() {
    setLoading(true);
    setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch(`/api/admin/post-approvals?status=${encodeURIComponent(filter)}`, { headers, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("admin.approvals.loadError"));
      const nextPosts = payload?.posts || [];
      setPosts(nextPosts);
      setSettings({
        available: Boolean(payload?.settings?.available),
        enabled: Boolean(payload?.settings?.enabled),
        reviewRecipient: payload?.settings?.reviewRecipient || "",
      });
      const nextDrafts = {};
      nextPosts.forEach((post) => {
        if (post.rejection) {
          nextDrafts[post.rejection.id] = {
            review_status: post.rejection.review_status || "new",
            refund_status: post.rejection.refund_status || "pending_review",
            admin_note: post.rejection.admin_note || "",
          };
        }
      });
      setDrafts(nextDrafts);
      if (selectedPostId && !nextPosts.some((post) => post.id === selectedPostId)) setSelectedPostId("");
      if (!selectedPostId) {
        const requestedPostId = new URLSearchParams(window.location.search).get("post");
        if (requestedPostId && nextPosts.some((post) => post.id === requestedPostId)) {
          setSelectedPostId(requestedPostId);
        }
      }
    } catch (loadError) {
      setError(loadError.message || t("admin.approvals.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function saveGateSettings() {
    setSettingsSaving(true);
    setError("");
    setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_settings",
          review_gate_enabled: settings.enabled,
          review_recipient: settings.reviewRecipient,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Inställningen kunde inte sparas.");
      setNotice(
        settings.enabled
          ? "Admin-granskningen är på. Nya kundmejl hålls tills du godkänner."
          : "Admin-granskningen är av. Normalt kundflöde används."
      );
      await loadPosts();
    } catch (saveError) {
      setError(saveError.message || "Inställningen kunde inte sparas.");
    } finally {
      setSettingsSaving(false);
    }
  }

  async function runAdminAction(action) {
    if (!selectedPost) return;
    setSavingId(selectedPost.id);
    setError("");
    setNotice("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action,
          post_id: selectedPost.id,
          admin_note: actionDraft.admin_note,
          product_urls: actionDraft.product_urls
            .split(/\r?\n/)
            .map((value) => value.trim())
            .filter(Boolean),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Åtgärden kunde inte slutföras.");
      setNotice(
        action === "approve"
          ? "Godkänt. Kundens vanliga godkännandemejl har skickats."
          : action === "regenerate"
            ? "Ny version är köad. Den visas bredvid den gamla när den är klar."
            : "Inlägget har nekats och inget kundmejl skickades."
      );
      setActionDraft({ admin_note: "", product_urls: "" });
      setSelectedPostId("");
      await loadPosts();
    } catch (actionError) {
      setError(actionError.message || "Åtgärden kunde inte slutföras.");
    } finally {
      setSavingId("");
    }
  }

  function updateDraft(id, changes) {
    setDrafts((current) => ({ ...current, [id]: { ...(current[id] || {}), ...changes } }));
  }

  async function saveReview(feedbackId) {
    setSavingId(feedbackId);
    setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ feedback_id: feedbackId, ...(drafts[feedbackId] || {}) }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("admin.approvals.saveError"));
      await loadPosts();
    } catch (saveError) {
      setError(saveError.message || t("admin.approvals.saveError"));
    } finally {
      setSavingId("");
    }
  }

  return (
    <AppLayout active="admin">
      <div className="admin-page admin-approvals-page admin-v74-approvals-page">
        <header className="admin-hero compact">
          <div>
            <span className="admin-eyebrow">{t("admin.approvals.kicker")}</span>
            <h1>{t("admin.approvals.title")}</h1>
            <p>{t("admin.approvals.description")}</p>
          </div>
          <button type="button" className="admin-primary-button" onClick={loadPosts}>
            <RefreshCw size={16} /> {t("admin.retry")}
          </button>
        </header>

        <section className="admin-v144-review-gate">
          <div>
            <span><ShieldCheck size={18} /> Global admin-granskning</span>
            <strong>{settings.enabled ? "På – kunden väntar på dig" : "Av – normalt flöde"}</strong>
            <p>När den är av ändras ingenting. När den är på hålls nya kundmejl tills du har granskat hela inlägget.</p>
          </div>
          <label className="admin-v144-switch">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                setSettings((current) => ({ ...current, enabled: event.target.checked }))
              }
            />
            <span>{settings.enabled ? "På" : "Av"}</span>
          </label>
          <label>
            <span>Skicka granskningsmejl till</span>
            <input
              type="email"
              placeholder="admin@spreelo.com"
              value={settings.reviewRecipient}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  reviewRecipient: event.target.value,
                }))
              }
            />
          </label>
          <button
            type="button"
            className="admin-primary-button"
            disabled={settingsSaving}
            onClick={saveGateSettings}
          >
            {settingsSaving ? <LoaderCircle className="admin-spin" size={16} /> : <Save size={16} />}
            Spara
          </button>
        </section>

        <div className="admin-approval-tabs">
          {[["all", t("admin.approvals.all")], ["pending_approval", t("admin.approvals.pending")], ["approved", t("admin.approvals.approved")], ["rejected", t("admin.approvals.rejected")]].map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>

        {error ? <div className="admin-alert error">{error}</div> : null}
        {notice ? <div className="admin-alert success">{notice}</div> : null}

        {loading ? (
          <section className="admin-loading-card"><LoaderCircle className="admin-spin" size={22} /> {t("admin.approvals.loading")}</section>
        ) : posts.length === 0 ? (
          <div className="admin-empty-state"><FileCheck2 size={28} /><strong>{t("admin.approvals.empty")}</strong></div>
        ) : (
          <section className="admin-v74-approval-table">
            <div className="admin-v74-approval-head" aria-hidden="true">
              <span>{t("admin.approvals.tableCompany")}</span>
              <span>{t("admin.approvals.tableCreated")}</span>
              <span>{t("admin.approvals.tableScheduled")}</span>
              <span>{t("admin.approvals.tableStatus")}</span>
              <span />
            </div>
            {posts.map((post) => {
              const effectiveStatus =
                post.admin_review?.status === "approved"
                  ? "approved"
                  : ["rejected", "superseded"].includes(post.admin_review?.status)
                    ? "rejected"
                    : post.status;
              const meta = statusMeta(effectiveStatus, t);
              return (
                <button type="button" className="admin-v74-approval-row" key={post.id} onClick={() => setSelectedPostId(post.id)}>
                  <strong>{post.brand_name || t("admin.approvals.unknownBrand")}</strong>
                  <span>{formatDate(post.created_at)}</span>
                  <span>{formatDate(post.scheduled_for)}</span>
                  <span className={`admin-approval-status ${meta.className}`}><meta.Icon size={15} />{meta.label}</span>
                  <ChevronRight size={18} />
                </button>
              );
            })}
          </section>
        )}

        {selectedPost ? (
          <div className="admin-v74-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPostId(""); }}>
            <section className="admin-v74-detail-modal" role="dialog" aria-modal="true" aria-label={t("admin.approvals.fullPost")}>
              <header>
                <div>
                  <span>{selectedPost.brand_name || t("admin.approvals.unknownBrand")}</span>
                  <h2>{t("admin.approvals.fullPost")}</h2>
                  <p>{formatDate(selectedPost.scheduled_for)} · {selectedPost.platform || "—"}</p>
                </div>
                <button type="button" onClick={() => setSelectedPostId("")} aria-label={t("admin.approvals.closePost")}><X size={20} /></button>
              </header>

              <div className="admin-v74-detail-body admin-v144-detail-body">
                <div className={`admin-v144-preview-comparison ${selectedPost.previous_post ? "has-previous" : ""}`}>
                  {selectedPost.previous_post ? (
                    <div className="admin-v74-email-preview admin-v144-previous-preview">
                      <div className="admin-v74-email-topline">FÖREGÅENDE VERSION</div>
                      <h3>{selectedPost.previous_post.post_type || selectedPost.previous_post.content_format || "Inlägg"}</h3>
                      <MediaPreview post={selectedPost.previous_post} t={t} />
                      <div className="admin-v74-post-copy">
                        <span>{t("admin.approvals.postCopy")}</span>
                        <p>{selectedPost.previous_post.content || t("admin.approvals.noContent")}</p>
                      </div>
                    </div>
                  ) : null}
                  <div className="admin-v74-email-preview">
                  <div className="admin-v74-email-topline">
                    {selectedPost.admin_review
                      ? `NY VERSION ${selectedPost.admin_review.revision || 1}`
                      : "SPREELO"}
                  </div>
                  <h3>{selectedPost.post_type || selectedPost.content_format || t("admin.approvals.post")}</h3>
                  <MediaPreview post={selectedPost} t={t} />
                  <div className="admin-v74-post-copy">
                    <span>{t("admin.approvals.postCopy")}</span>
                    <p>{selectedPost.content || t("admin.approvals.noContent")}</p>
                  </div>
                  </div>
                </div>

                <aside className="admin-v74-detail-meta">
                  {(() => { const meta = statusMeta(selectedPost.status, t); return <span className={`admin-approval-status ${meta.className}`}><meta.Icon size={16} />{meta.label}</span>; })()}
                  <dl>
                    <div><dt>{t("admin.approvals.created")}</dt><dd>{formatDate(selectedPost.created_at)}</dd></div>
                    <div><dt>{t("admin.approvals.scheduled")}</dt><dd>{formatDate(selectedPost.scheduled_for)}</dd></div>
                    <div><dt>{t("admin.approvals.platform")}</dt><dd>{selectedPost.platform || "—"}</dd></div>
                  </dl>

                  {selectedPost.admin_review ? (
                    <div className="admin-v144-review-actions">
                      <strong>Adminbeslut</strong>
                      <p>Kunden har inte fått mejlet förrän du godkänner.</p>
                      <label>
                        <span>Intern anteckning</span>
                        <textarea
                          value={actionDraft.admin_note}
                          onChange={(event) =>
                            setActionDraft((current) => ({
                              ...current,
                              admin_note: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Produktlänkar för omkörning (en per rad)</span>
                        <textarea
                          className="admin-v144-product-urls"
                          placeholder={"https://kund.se/produkt-1\nhttps://kund.se/produkt-2"}
                          value={actionDraft.product_urls}
                          onChange={(event) =>
                            setActionDraft((current) => ({
                              ...current,
                              product_urls: event.target.value,
                            }))
                          }
                        />
                        <small>Lämna tomt för en ny automatisk sökning. Angivna länkar används exakt och fungerar även för video och singelprodukt.</small>
                      </label>
                      <div className="admin-v144-action-buttons">
                        {selectedPost.admin_review.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              className="admin-primary-button"
                              disabled={savingId === selectedPost.id}
                              onClick={() => runAdminAction("approve")}
                            >
                              <CheckCircle2 size={16} /> Godkänn och skicka till kund
                            </button>
                            <button
                              type="button"
                              className="admin-v144-danger-button"
                              disabled={savingId === selectedPost.id}
                              onClick={() => runAdminAction("reject")}
                            >
                              <XCircle size={16} /> Neka
                            </button>
                          </>
                        ) : null}
                        {["pending", "rejected"].includes(selectedPost.admin_review.status) ? (
                          <button
                            type="button"
                            className="admin-v144-secondary-button"
                            disabled={savingId === selectedPost.id}
                            onClick={() => runAdminAction("regenerate")}
                          >
                            {savingId === selectedPost.id ? (
                              <LoaderCircle className="admin-spin" size={16} />
                            ) : (
                              <RotateCcw size={16} />
                            )}
                            Skapa ny version
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {selectedPost.rejection ? (
                    <div className="admin-v74-rejection-review">
                      <strong>{t("admin.approvals.customerReason")}</strong>
                      <span>{selectedPost.rejection.reason_category}</span>
                      <p>{selectedPost.rejection.reason_text}</p>
                      <label><span>{t("admin.approvals.reviewStatus")}</span><select value={drafts[selectedPost.rejection.id]?.review_status || "new"} onChange={(event) => updateDraft(selectedPost.rejection.id, { review_status: event.target.value })}><option value="new">{t("admin.approvals.review.new")}</option><option value="reviewing">{t("admin.approvals.review.reviewing")}</option><option value="resolved">{t("admin.approvals.review.resolved")}</option></select></label>
                      <label><span>{t("admin.approvals.refundStatus")}</span><select value={drafts[selectedPost.rejection.id]?.refund_status || "pending_review"} onChange={(event) => updateDraft(selectedPost.rejection.id, { refund_status: event.target.value })}><option value="pending_review">{t("admin.approvals.refund.pending")}</option><option value="approved">{t("admin.approvals.refund.approved")}</option><option value="declined">{t("admin.approvals.refund.declined")}</option><option value="credited">{t("admin.approvals.refund.credited")}</option></select></label>
                      <label><span>{t("admin.approvals.adminNote")}</span><textarea value={drafts[selectedPost.rejection.id]?.admin_note || ""} onChange={(event) => updateDraft(selectedPost.rejection.id, { admin_note: event.target.value })} /></label>
                      <button type="button" className="admin-primary-button" disabled={savingId === selectedPost.rejection.id} onClick={() => saveReview(selectedPost.rejection.id)}>{savingId === selectedPost.rejection.id ? <LoaderCircle className="admin-spin" size={16} /> : <Save size={16} />}{t("admin.approvals.saveReview")}</button>
                    </div>
                  ) : null}
                </aside>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
