"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileCheck2,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Save,
  Plus,
  Trash2,
  Upload,
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
  if (status === "creating") return { label: t("admin.approvals.statusCreating"), className: "pending", Icon: LoaderCircle };
  if (status === "needs_repair") return { label: t("admin.approvals.statusNeedsRepair"), className: "failed", Icon: AlertTriangle };
  if (status === "sent_directly") return { label: t("admin.approvals.statusSentDirectly"), className: "approved", Icon: CheckCircle2 };
  if (status === "approved_by_spreelo") return { label: t("admin.approvals.statusApprovedBySpreelo"), className: "approved", Icon: CheckCircle2 };
  if (status === "failed") return { label: t("admin.approvals.failed"), className: "failed", Icon: AlertTriangle };
  if (status === "approved") return { label: t("admin.approvals.approved"), className: "approved", Icon: CheckCircle2 };
  if (status === "rejected") return { label: t("admin.approvals.rejected"), className: "rejected", Icon: XCircle };
  return { label: t("admin.approvals.pending"), className: "pending", Icon: Clock3 };
}

function MediaPreview({ post, t }) {
  if (post.slides?.length) {
    return (
      <div className="admin-v74-slide-grid">
        {post.slides.map((slide) => (
          <article key={`${post.id}-${slide.slide_order}`}>
            {slide.image_url ? <img src={slide.image_url} alt="" /> : <span><ImageIcon size={22} /></span>}
            <div>
              <strong>{slide.headline || slide.metadata?.product_title || `Slide ${slide.slide_order}`}</strong>
              {slide.body ? <p>{slide.body}</p> : null}
              {slide.cta_text ? <small>{slide.cta_text}</small> : null}
            </div>
          </article>
        ))}
      </div>
    );
  }
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
  const [reviewGateEnabled, setReviewGateEnabled] = useState(false);
  const [savingReviewGate, setSavingReviewGate] = useState(false);
  const [releasingPostId, setReleasingPostId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [postCopy, setPostCopy] = useState("");
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId]
  );

  useEffect(() => { loadPosts(); }, [filter]);
  useEffect(() => { loadReviewGate(); }, []);
  useEffect(() => {
    if (!selectedPostId) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") setSelectedPostId(""); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPostId]);
  useEffect(() => {
    setMaterials(selectedPost?.admin_product_items || []);
    setPostCopy(selectedPost?.content || "");
  }, [selectedPost]);

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
    } catch (loadError) {
      setError(loadError.message || t("admin.approvals.loadError"));
    } finally {
      setLoading(false);
    }
  }

  async function loadReviewGate() {
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-review-settings", { headers, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (response.ok) setReviewGateEnabled(Boolean(payload?.requireAdminPostApproval));
    } catch {
      // The approval list remains available if this separate setting cannot load.
    }
  }

  async function updateReviewGate(enabled) {
    setSavingReviewGate(true);
    setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-review-settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ requireAdminPostApproval: enabled }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("admin.approvals.settingError"));
      setReviewGateEnabled(Boolean(payload?.requireAdminPostApproval));
    } catch (saveError) {
      setError(saveError.message || t("admin.approvals.settingError"));
    } finally {
      setSavingReviewGate(false);
    }
  }

  async function releaseToCustomer(postId) {
    setReleasingPostId(postId);
    setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "release_to_customer", post_id: postId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || t("admin.approvals.releaseError"));
      await loadPosts();
    } catch (releaseError) {
      setError(releaseError.message || t("admin.approvals.releaseError"));
    } finally {
      setReleasingPostId("");
    }
  }

  async function runAdminAction(payload) {
    const headers = await getHeaders();
    const response = await fetch("/api/admin/post-approvals", { method: "PATCH", headers, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error || "The admin action failed.");
    return result;
  }

  async function saveMaterials() {
    if (!selectedPost) return;
    setSavingMaterials(true);
    setError("");
    try {
      await runAdminAction({
        action: "save_materials",
        post_id: selectedPost.status === "failed" ? null : selectedPost.id,
        occurrence_id: selectedPost.occurrence_id || null,
        content: postCopy,
        product_items: materials,
      });
      await loadPosts();
    } catch (actionError) { setError(actionError.message); }
    finally { setSavingMaterials(false); }
  }

  async function regenerateFromMaterials() {
    if (!selectedPost) return;
    setRegenerating(true); setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals/regenerate", { method: "POST", headers, body: JSON.stringify({ post_id: selectedPost.status === "failed" ? null : selectedPost.id, occurrence_id: selectedPost.occurrence_id || null, content: postCopy, product_items: materials }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Regeneration failed.");
      setSelectedPostId(result.post_id); await loadPosts();
    } catch (actionError) { setError(actionError.message); }
    finally { setRegenerating(false); }
  }

  async function uploadProductImage(index, file) {
    if (!file) return;
    setError("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals/upload", { method: "POST", headers, body: JSON.stringify({ content_type: file.type, size: file.size }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Could not prepare image upload.");
      const { error: uploadError } = await supabase.storage.from(result.bucket).uploadToSignedUrl(result.path, result.token, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      setMaterials((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, image_url: result.public_url } : item));
    } catch (uploadError) { setError(uploadError.message || "Image upload failed."); }
  }

  async function archiveSelected(ids) {
    const postIds = ids.filter((id) => !id.startsWith("occurrence-"));
    if (!postIds.length) return;
    try {
      await runAdminAction({ action: "bulk_archive", post_ids: postIds });
      setSelectedIds([]); setSelectedPostId(""); await loadPosts();
    } catch (actionError) { setError(actionError.message); }
  }

  async function setBrandPolicy(required) {
    if (!selectedPost?.brand_profile_id) return;
    try {
      await runAdminAction({ action: "set_brand_review_policy", brand_profile_id: selectedPost.brand_profile_id, admin_review_required: required });
      await loadPosts();
    } catch (actionError) { setError(actionError.message); }
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

        <section className={`admin-review-gate-card ${reviewGateEnabled ? "enabled" : ""}`}>
          <div>
            <span>{t("admin.approvals.reviewGateEyebrow")}</span>
            <strong>{t("admin.approvals.reviewGateTitle")}</strong>
            <p>{reviewGateEnabled ? t("admin.approvals.reviewGateOn") : t("admin.approvals.reviewGateOff")}</p>
          </div>
          <button
            type="button"
            className={`admin-review-gate-switch ${reviewGateEnabled ? "on" : ""}`}
            aria-pressed={reviewGateEnabled}
            aria-label={t("admin.approvals.reviewGateTitle")}
            disabled={savingReviewGate}
            onClick={() => updateReviewGate(!reviewGateEnabled)}
          ><span /></button>
        </section>

        <div className="admin-approval-tabs">
          {[["all", t("admin.approvals.all")], ["pending_approval", t("admin.approvals.pending")], ["failed", t("admin.approvals.failed")], ["approved", t("admin.approvals.approved")], ["rejected", t("admin.approvals.rejected")]].map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
        {selectedIds.length ? (
          <div className="admin-workbench-bulkbar">
            <strong>{selectedIds.length} selected</strong>
            <button type="button" onClick={() => archiveSelected(selectedIds)}><Trash2 size={15} /> Archive selected</button>
          </div>
        ) : null}

        {error ? <div className="admin-alert error">{error}</div> : null}

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
              const displayStatus = post.admin_review_status === "approved_by_spreelo"
                ? "approved_by_spreelo"
                : post.admin_review_status === "not_required" && post.approval_email_sent_at
                  ? "sent_directly"
                  : post.admin_review_status === "needs_repair" || post.admin_review_status === "failure"
                    ? "needs_repair"
                    : post.status;
              const meta = statusMeta(displayStatus, t);
              return (
                <button type="button" className="admin-v74-approval-row" key={post.id} onClick={() => setSelectedPostId(post.id)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(post.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, post.id] : ids.filter((id) => id !== post.id))}
                    aria-label="Select post"
                  />
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

              <div className="admin-v74-detail-body">
                <div className="admin-v74-email-preview">
                  <div className="admin-v74-email-topline">SPREELO</div>
                  <h3>{selectedPost.post_type || selectedPost.content_format || t("admin.approvals.post")}</h3>
                  <MediaPreview post={selectedPost} t={t} />
                  <div className="admin-v74-post-copy">
                    <span>{t("admin.approvals.postCopy")}</span>
                    <p>{selectedPost.content || t("admin.approvals.noContent")}</p>
                  </div>
                  <section className="admin-material-workbench">
                    <div className="admin-material-workbench-title">
                      <div><span>Repair materials</span><strong>Products and post text</strong></div>
                      <button type="button" onClick={() => setMaterials((items) => [...items, { title: "", description: "", url: "", image_url: "" }])}><Plus size={15} /> Add product</button>
                    </div>
                    <label><span>Post text</span><textarea value={postCopy} onChange={(event) => setPostCopy(event.target.value)} /></label>
                    <div className="admin-material-list">
                      {materials.map((item, index) => (
                        <article key={`${selectedPost.id}-material-${index}`}>
                          <div className="admin-material-image">
                            {item.image_url ? <img src={item.image_url} alt="" /> : <ImageIcon size={22} />}
                            <label><Upload size={14} /> Replace image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadProductImage(index, event.target.files?.[0])} /></label>
                          </div>
                          <div className="admin-material-fields">
                            <input value={item.title || ""} placeholder="Product name" onChange={(event) => setMaterials((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, title: event.target.value } : row))} />
                            <textarea value={item.description || ""} placeholder="Product information for caption and hashtags" onChange={(event) => setMaterials((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, description: event.target.value } : row))} />
                            <input value={item.url || ""} placeholder="Verified product URL" onChange={(event) => setMaterials((items) => items.map((row, rowIndex) => rowIndex === index ? { ...row, url: event.target.value } : row))} />
                          </div>
                          <button type="button" className="admin-material-remove" onClick={() => setMaterials((items) => items.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove product"><Trash2 size={16} /></button>
                        </article>
                      ))}
                    </div>
                    <button type="button" className="admin-primary-button" disabled={savingMaterials} onClick={saveMaterials}>{savingMaterials ? <LoaderCircle className="admin-spin" size={16} /> : <Save size={16} />} Save repair materials</button>
                    <button type="button" className="admin-primary-button admin-regenerate-button" disabled={regenerating || !materials.some((item) => item.title && item.image_url)} onClick={regenerateFromMaterials}>{regenerating ? <LoaderCircle className="admin-spin" size={16} /> : <RefreshCw size={16} />} Regenerate complete post</button>
                  </section>
                </div>

                <aside className="admin-v74-detail-meta">
                  {(() => { const meta = statusMeta(selectedPost.status, t); return <span className={`admin-approval-status ${meta.className}`}><meta.Icon size={16} />{meta.label}</span>; })()}
                  <dl>
                    <div><dt>{t("admin.approvals.created")}</dt><dd>{formatDate(selectedPost.created_at)}</dd></div>
                    <div><dt>{t("admin.approvals.scheduled")}</dt><dd>{formatDate(selectedPost.scheduled_for)}</dd></div>
                    <div><dt>{t("admin.approvals.platform")}</dt><dd>{selectedPost.platform || "—"}</dd></div>
                  </dl>
                  <div className="admin-brand-review-policy">
                    <strong>Brand review policy</strong>
                    <p>Every post stays visible here. Choose whether complete posts also need Spreelo approval before the customer email.</p>
                    <label><input type="checkbox" checked={selectedPost.brand_admin_review_required !== false} onChange={(event) => setBrandPolicy(event.target.checked)} /> Require Spreelo review for {selectedPost.brand_name || "this brand"}</label>
                  </div>

                  {selectedPost.status === "failed" ? (
                    <div className="admin-generation-error-card">
                      <AlertTriangle size={20} />
                      <div>
                        <strong>{t("admin.approvals.generationFailedTitle")}</strong>
                        <p>{selectedPost.video_error || `${t("admin.approvals.imageStatus")}: ${selectedPost.image_status || "—"}. ${t("admin.approvals.videoStatus")}: ${selectedPost.video_status || "—"}.`}</p>
                        <small>{t("admin.approvals.generationFailedHelp")}</small>
                        {selectedPost.failure ? (
                          <details className="admin-generation-error-details">
                            <summary>{t("admin.approvals.failureDetails")}</summary>
                            <dl>
                              <div><dt>{t("admin.approvals.failureStage")}</dt><dd>{selectedPost.failure.failure_stage || "—"}</dd></div>
                              <div><dt>{t("admin.approvals.failureCode")}</dt><dd>{selectedPost.failure.failure_code || "—"}</dd></div>
                              <div><dt>{t("admin.approvals.contentType")}</dt><dd>{selectedPost.failure.content_type_label || selectedPost.failure.content_format || "—"}</dd></div>
                            </dl>
                            <pre>{JSON.stringify(selectedPost.failure, null, 2)}</pre>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {selectedPost.admin_review_status === "pending" && selectedPost.status !== "failed" ? (
                    <button
                      type="button"
                      className="admin-primary-button admin-release-button"
                      disabled={releasingPostId === selectedPost.id}
                      onClick={() => releaseToCustomer(selectedPost.id)}
                    >
                      {releasingPostId === selectedPost.id ? <LoaderCircle className="admin-spin" size={16} /> : <CheckCircle2 size={16} />}
                      {t("admin.approvals.releaseToCustomer")}
                    </button>
                  ) : null}
                  {!selectedPost.id.startsWith("occurrence-") ? <button type="button" className="admin-archive-button" onClick={() => archiveSelected([selectedPost.id])}><Trash2 size={15} /> Archive post</button> : null}

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
