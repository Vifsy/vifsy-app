"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileCheck2,
  ImageIcon,
  Link2,
  LoaderCircle,
  Maximize2,
  PackageCheck,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
  ZoomIn,
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

const CAROUSEL_PRODUCT_COUNT = 5;
const emptyCarouselProduct = () => ({
  title: "",
  description: "",
  url: "",
  image_url: "",
  preview_image_url: "",
  product_brand: "",
  product_identifier: "",
  product_display_type: "",
  product_color: "",
  product_price: "",
  product_image_width: null,
  product_image_height: null,
  product_identity_locked: false,
  product_image_semantic_verified: false,
  locked_product_fingerprint: "",
  manual_override: false,
  manual_image_override: false,
  manual_override_note: "",
});
function isMaterialReady(item) {
  if (!item) return false;
  if (item.manual_override === true) return Boolean(item.title?.trim() && item.image_url?.trim());
  return Boolean(item.url?.trim());
}
function isCarouselPost(post) {
  return /carousel/i.test(String(post?.content_format || post?.post_type || ""));
}
function isSyntheticAdminCaseId(id) {
  const value = String(id || "");
  return value.startsWith("occurrence-") || value.startsWith("review-case-");
}
function getFiveCarouselProducts(items) {
  return Array.from({ length: CAROUSEL_PRODUCT_COUNT }, (_, index) => ({
    ...emptyCarouselProduct(),
    ...(Array.isArray(items) ? items[index] : null),
  }));
}

function getPostMediaItems(post) {
  if (Array.isArray(post?.slides) && post.slides.length) {
    return post.slides
      .filter((slide) => slide?.image_url)
      .map((slide, index) => ({
        url: slide.image_url,
        label: slide.headline || slide.metadata?.product_title || `Slide ${slide.slide_order || index + 1}`,
        productUrl: slide.product_url || "",
        order: slide.slide_order || index + 1,
      }));
  }
  return post?.image_url
    ? [{ url: post.image_url, label: post.post_type || post.content_format || "Post image", productUrl: post?.admin_product_items?.[0]?.url || "", order: 1 }]
    : [];
}

function MediaPreview({ post, t, onOpen }) {
  const mediaItems = getPostMediaItems(post);
  if (post.slides?.length) {
    return (
      <div className="admin-review-media-section">
        <div className="admin-review-section-heading">
          <div><span>{t("admin.approvals.visualReview")}</span><strong>{t(mediaItems.length === 1 ? "admin.approvals.oneImage" : "admin.approvals.imageCount", { count: mediaItems.length })}</strong></div>
          <small>{t("admin.approvals.inspectImagesHelp")}</small>
        </div>
        <div className="admin-v74-slide-grid admin-review-slide-grid">
          {post.slides.map((slide) => {
            const mediaIndex = mediaItems.findIndex((item) => item.url === slide.image_url);
            return (
              <article key={`${post.id}-${slide.slide_order}`}>
                {slide.image_url ? (
                  <button type="button" className="admin-review-image-button" onClick={() => onOpen?.(Math.max(0, mediaIndex))}>
                    <img src={slide.image_url} alt="" />
                    <span className="admin-review-image-zoom"><Maximize2 size={16} /> {t("admin.approvals.inspect")}</span>
                  </button>
                ) : <span><ImageIcon size={22} /></span>}
                <div>
                  <strong>{slide.headline || slide.metadata?.product_title || `Slide ${slide.slide_order}`}</strong>
                  {slide.body ? <p>{slide.body}</p> : null}
                  {slide.cta_text ? <small>{slide.cta_text}</small> : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }
  if (post.video_url) {
    return (
      <div className="admin-v74-media-frame admin-review-primary-media">
        <video src={post.video_url} controls playsInline preload="metadata" />
      </div>
    );
  }
  if (post.image_url) {
    return (
      <div className="admin-v74-media-frame admin-review-primary-media">
        <button type="button" className="admin-review-image-button admin-review-single-image" onClick={() => onOpen?.(0)}>
          <img src={post.image_url} alt="" />
          <span className="admin-review-image-zoom"><ZoomIn size={17} /> {t("admin.approvals.inspectFullSize")}</span>
        </button>
      </div>
    );
  }
  return <div className="admin-v74-no-media"><ImageIcon size={22} />{t("admin.approvals.noMedia")}</div>;
}

export default function AdminPostApprovalsPage() {
  const { t } = useUiText(["admin"]);
  const [filter, setFilter] = useState(() => {
    if (typeof window === "undefined") return "queue";
    const view = new URLSearchParams(window.location.search).get("view");
    return ["queue", "failed", "history"].includes(view) ? view : "queue";
  });
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
  const [regenerating, setRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState("");
  const [regenerationSuccess, setRegenerationSuccess] = useState("");
  const [outroSlide, setOutroSlide] = useState(null);
  const [outroRemoved, setOutroRemoved] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [resolvingProductIndex, setResolvingProductIndex] = useState(null);
  const [savingReviewChanges, setSavingReviewChanges] = useState(false);
  const [editorDirty, setEditorDirty] = useState(false);
  const [productDirty, setProductDirty] = useState(false);
  const [editorPostId, setEditorPostId] = useState("");
  const [manualEditingIndices, setManualEditingIndices] = useState([]);

  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) || null,
    [posts, selectedPostId]
  );
  const lightboxItems = useMemo(() => getPostMediaItems(selectedPost), [selectedPost]);
  const carouselReady =
    isCarouselPost(selectedPost) &&
    materials.length === CAROUSEL_PRODUCT_COUNT &&
    materials.every(isMaterialReady);
  const singleProductReady =
    Boolean(selectedPost) &&
    !isCarouselPost(selectedPost) &&
    isMaterialReady(materials?.[0]);
  const verifiedMaterialCount = materials.filter(
    (item) => item.product_identity_locked === true && item.product_image_semantic_verified === true
  ).length;
  const manualMaterialCount = materials.filter((item) => item.manual_override === true).length;
  const lowResolutionMaterialCount = materials.filter((item) => {
    const width = Number(item?.product_image_width || 0);
    const height = Number(item?.product_image_height || 0);
    return width > 0 && height > 0 && Math.max(width, height) < 1000;
  }).length;

  useEffect(() => { loadPosts(); }, [filter]);
  useEffect(() => {
    const refresh = () => fetchPosts("", true);
    const intervalId = window.setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refresh);
    };
  }, [filter, selectedPostId]);
  useEffect(() => { loadReviewGate(); }, []);
  useEffect(() => {
    if (!selectedPostId && lightboxIndex === null) return undefined;
    const onKeyDown = (event) => {
      if (lightboxIndex !== null) {
        if (event.key === "Escape") setLightboxIndex(null);
        if (event.key === "ArrowLeft") setLightboxIndex((index) => lightboxItems.length ? (Number(index || 0) - 1 + lightboxItems.length) % lightboxItems.length : null);
        if (event.key === "ArrowRight") setLightboxIndex((index) => lightboxItems.length ? (Number(index || 0) + 1) % lightboxItems.length : null);
        return;
      }
      if (event.key === "Escape") setSelectedPostId("");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPostId, lightboxIndex, lightboxItems.length]);
  useEffect(() => {
    if (!selectedPost) {
      setMaterials([]);
      setPostCopy("");
      setOutroSlide(null);
      setOutroRemoved(false);
      setRegenerationError("");
      setRegenerationSuccess("");
      setLightboxIndex(null);
      setEditorPostId("");
      setEditorDirty(false);
      setProductDirty(false);
      setManualEditingIndices([]);
      return;
    }
    // Do not let the 15-second admin polling overwrite an open edit session.
    if (editorPostId === selectedPost.id && (editorDirty || productDirty)) return;
    const isEmptyFailedSingle = selectedPost.status === "failed" &&
      !isCarouselPost(selectedPost) &&
      !selectedPost?.admin_product_items?.length;
    setMaterials(
      isCarouselPost(selectedPost)
        ? getFiveCarouselProducts(selectedPost?.admin_product_items)
        : selectedPost?.admin_product_items?.length
          ? [{ ...emptyCarouselProduct(), ...(selectedPost.admin_product_items[0] || {}) }]
          : selectedPost.status === "failed"
            ? [emptyCarouselProduct()]
            : []
    );
    setPostCopy(selectedPost?.content || "");
    setOutroSlide(selectedPost?.outro_slide || null);
    setOutroRemoved(false);
    setRegenerationError("");
    setRegenerationSuccess("");
    setLightboxIndex(null);
    setEditorPostId(selectedPost.id);
    setEditorDirty(false);
    setProductDirty(false);
    // Failed single-product generations often contain no scraped material at
    // all. Open the manual repair form immediately so an admin can paste the
    // product name/text and upload the source image without an extra click.
    setManualEditingIndices(isEmptyFailedSingle ? [0] : []);
  }, [selectedPost, editorPostId, editorDirty, productDirty]);

  function markEditorDirty({ product = false } = {}) {
    setEditorDirty(true);
    if (product) setProductDirty(true);
  }

  function updateMaterial(index, patch, { manual = false } = {}) {
    setMaterials((items) => items.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        ...patch,
        ...(manual ? {
          manual_override: true,
          product_identity_locked: false,
          product_image_semantic_verified: false,
          locked_product_fingerprint: "",
        } : {}),
      };
    }));
    markEditorDirty({ product: true });
  }

  function toggleManualEditor(index) {
    setManualEditingIndices((current) =>
      current.includes(index)
        ? current.filter((value) => value !== index)
        : [...current, index]
    );
  }

  function renderManualProductEditor(item, index) {
    if (!manualEditingIndices.includes(index)) return null;
    const setField = (field, value) => updateMaterial(index, { [field]: value }, { manual: true });
    return (
      <div className="admin-product-manual-editor">
        <div className="admin-product-manual-heading">
          <div>
            <Pencil size={15} />
            <span>
              <strong>{t("admin.approvals.manualOverride")}</strong>
              <small>{t("admin.approvals.manualOverrideHelp")}</small>
            </span>
          </div>
          <span className="admin-product-manual-warning">{t("admin.approvals.notSourceVerified")}</span>
        </div>
        <div className="admin-product-manual-fields">
          <label><span>{t("admin.approvals.brand")}</span><input value={item.product_brand || ""} onChange={(event) => setField("product_brand", event.target.value)} /></label>
          <label><span>{t("admin.approvals.productName")}</span><input value={item.title || ""} onChange={(event) => setField("title", event.target.value)} /></label>
          <label><span>{t("admin.approvals.productType")}</span><input value={item.product_display_type || ""} onChange={(event) => setField("product_display_type", event.target.value)} /></label>
          <label><span>{t("admin.approvals.variant")}</span><input value={item.product_color || ""} onChange={(event) => setField("product_color", event.target.value)} /></label>
          <label><span>{t("admin.approvals.sku")}</span><input value={item.product_identifier || ""} onChange={(event) => setField("product_identifier", event.target.value)} /></label>
          <label><span>{t("admin.approvals.priceOptional")}</span><input value={item.product_price || ""} onChange={(event) => setField("product_price", event.target.value)} /></label>
          <label className="admin-product-manual-description"><span>{t("admin.approvals.productDescription")}</span><textarea value={item.description || ""} onChange={(event) => setField("description", event.target.value)} /></label>
        </div>
        <div className="admin-product-manual-actions">
          <label className="admin-product-upload-button">
            <Upload size={15} /> {t("admin.approvals.uploadProductImage")}
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadProductImage(index, event.target.files?.[0])} />
          </label>
          {item.url ? (
            <button type="button" onClick={() => resolveMaterialProduct(index)} disabled={resolvingProductIndex === index}>
              <RotateCcw size={15} /> {t("admin.approvals.resetToSource")}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  async function loadPosts(preferredSelectedPostId = "") {
    return fetchPosts(preferredSelectedPostId, false);
  }

  async function fetchPosts(preferredSelectedPostId = "", silent = false) {
    if (!silent) setLoading(true);
    if (!silent) setError("");
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
      const selectionToKeep = preferredSelectedPostId || selectedPostId;
      if (selectionToKeep && nextPosts.some((post) => post.id === selectionToKeep)) setSelectedPostId(selectionToKeep);
      else if (selectionToKeep) setSelectedPostId("");
    } catch (loadError) {
      setError(loadError.message || t("admin.approvals.loadError"));
    } finally {
      if (!silent) setLoading(false);
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

  async function saveCurrentReviewChanges() {
    if (!selectedPost || isSyntheticAdminCaseId(selectedPost.id)) return;
    setSavingReviewChanges(true);
    setRegenerationError("");
    setRegenerationSuccess("");
    try {
      await runAdminAction({
        action: "save_materials",
        post_id: selectedPost.id,
        occurrence_id: selectedPost.occurrence_id || null,
        content: postCopy,
        product_items: materials,
      });
      setEditorDirty(false);
      await loadPosts(selectedPost.id);
      setSelectedPostId(selectedPost.id);
      setRegenerationSuccess(
        productDirty
          ? t("admin.approvals.savedNeedsRegeneration")
          : t("admin.approvals.reviewChangesSaved")
      );
    } catch (actionError) {
      setRegenerationError(actionError.message || "Could not save review changes.");
    } finally {
      setSavingReviewChanges(false);
    }
  }

  async function regenerateFromMaterials() {
    if (!selectedPost) return;
    setRegenerating(true);
    setError("");
    setRegenerationError("");
    setRegenerationSuccess("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals/regenerate", { method: "POST", headers, body: JSON.stringify({ post_id: selectedPost.status === "failed" ? null : selectedPost.id, occurrence_id: selectedPost.occurrence_id || null, review_case_id: selectedPost.failure?.review_case_id || null, content: postCopy, product_items: materials, preserve_outro: !outroRemoved && Boolean(outroSlide?.image_url), outro_slide: !outroRemoved ? outroSlide : null }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Regeneration failed.");
      setEditorDirty(false);
      setProductDirty(false);
      await loadPosts(result.post_id);
      setSelectedPostId(result.post_id);
      setRegenerationSuccess(t("admin.approvals.carouselRegenerated", { count: result.slide_count || 6 }));
    } catch (actionError) {
      const message = actionError.message || "Regeneration failed.";
      setRegenerationError(message);
      setError(message);
    } finally { setRegenerating(false); }
  }

  async function regenerateSingleProduct() {
    if (!selectedPost || !singleProductReady) return;
    setRegenerating(true);
    setError("");
    setRegenerationError("");
    setRegenerationSuccess("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals/regenerate-product", {
        method: "POST",
        headers,
        body: JSON.stringify({
          post_id: selectedPost.status === "failed" ? null : selectedPost.id,
          occurrence_id: selectedPost.occurrence_id || null,
          review_case_id: selectedPost.failure?.review_case_id || null,
          product_url: materials[0].url,
          product_item: materials[0],
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Product post regeneration failed.");
      setEditorDirty(false);
      setProductDirty(false);
      await loadPosts(result.post_id);
      setSelectedPostId(result.post_id);
      setRegenerationSuccess(
        result.format === "animated_product_reel"
          ? t("admin.approvals.productReelRegenerated")
          : result.format === "ai_product_ad"
            ? t("admin.approvals.productAdRegenerated")
            : t("admin.approvals.productPostRegenerated")
      );
    } catch (actionError) {
      const message = actionError.message || "Product post regeneration failed.";
      setRegenerationError(message);
      setError(message);
    } finally {
      setRegenerating(false);
    }
  }

  async function resolveMaterialProduct(index) {
    const productUrl = String(materials?.[index]?.url || "").trim();
    if (!selectedPost || !productUrl) return;
    setResolvingProductIndex(index);
    setRegenerationError("");
    setRegenerationSuccess("");
    try {
      const headers = await getHeaders();
      const response = await fetch("/api/admin/post-approvals/resolve-product", {
        method: "POST",
        headers,
        body: JSON.stringify({
          post_id: selectedPost.status === "failed" ? null : selectedPost.id,
          occurrence_id: selectedPost.occurrence_id || null,
          product_url: productUrl,
          title_hint: materials?.[index]?.title || "",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error || "Could not verify product URL.");
      setMaterials((items) => items.map((item, itemIndex) =>
        itemIndex === index ? { ...emptyCarouselProduct(), ...(result.product || {}), manual_override: false, manual_image_override: false } : item
      ));
      setEditorDirty(true);
      setProductDirty(true);
      setRegenerationSuccess(
        isCarouselPost(selectedPost)
          ? t("admin.approvals.productFetched", { number: index + 1 })
          : t("admin.approvals.replacementFetched")
      );
    } catch (actionError) {
      setRegenerationError(actionError.message || "Could not verify product URL.");
    } finally {
      setResolvingProductIndex(null);
    }
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
      setMaterials((items) => items.map((item, itemIndex) => itemIndex === index ? {
        ...item,
        image_url: result.public_url,
        preview_image_url: "",
        product_image_width: null,
        product_image_height: null,
        manual_override: true,
        manual_image_override: true,
        product_identity_locked: false,
        product_image_semantic_verified: false,
        locked_product_fingerprint: "",
      } : item));
      markEditorDirty({ product: true });
    } catch (uploadError) { setError(uploadError.message || "Image upload failed."); }
  }

  async function archiveSelected(ids) {
    const postIds = ids.filter((id) => !isSyntheticAdminCaseId(id));
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
          <button type="button" className="admin-primary-button" onClick={() => loadPosts()}>
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

        <div className="admin-approval-tabs admin-v14370-review-tabs">
          {[["queue", t("admin.approvals.queue")], ["failed", t("admin.approvals.needsRepair")], ["history", t("admin.approvals.history")]].map(([value, label]) => (
            <button type="button" key={value} className={filter === value ? "active" : ""} onClick={() => {
              setSelectedPostId("");
              setSelectedIds([]);
              setFilter(value);
              if (typeof window !== "undefined") {
                const nextUrl = new URL(window.location.href);
                nextUrl.searchParams.set("view", value);
                window.history.replaceState({}, "", nextUrl);
              }
            }}>{label}</button>
          ))}
        </div>
        <section className="admin-v14370-queue-intro">
          <div>
            <span>{filter === "history" ? t("admin.approvals.historyEyebrow") : filter === "failed" ? t("admin.approvals.repairEyebrow") : t("admin.approvals.queueEyebrow")}</span>
            <strong>{filter === "history" ? t("admin.approvals.historyTitle") : filter === "failed" ? t("admin.approvals.repairTitle") : t("admin.approvals.queueTitle")}</strong>
            <p>{filter === "history" ? t("admin.approvals.historyText") : filter === "failed" ? t("admin.approvals.repairText") : t("admin.approvals.queueText")}</p>
          </div>
          <b>{posts.length}</b>
        </section>
        {selectedIds.length ? (
          <div className="admin-workbench-bulkbar">
            <strong>{t("admin.approvals.selectedCount", { count: selectedIds.length })}</strong>
            <button type="button" onClick={() => archiveSelected(selectedIds)}><Trash2 size={15} /> {t("admin.approvals.archiveSelected")}</button>
          </div>
        ) : null}

        {error ? <div className="admin-alert error">{error}</div> : null}

        {loading ? (
          <section className="admin-loading-card"><LoaderCircle className="admin-spin" size={22} /> {t("admin.approvals.loading")}</section>
        ) : posts.length === 0 ? (
          <div className="admin-empty-state"><FileCheck2 size={28} /><strong>{t("admin.approvals.empty")}</strong></div>
        ) : (
          <section className="admin-v74-approval-table admin-v14370-review-list">
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
                <button type="button" className="admin-v74-approval-row admin-v14370-review-row" key={post.id} onClick={() => setSelectedPostId(post.id)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(post.id)}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, post.id] : ids.filter((id) => id !== post.id))}
                    aria-label={t("admin.approvals.selectPost")}
                  />
                  <span className="admin-v14370-review-thumb">
                    {(post.slides?.[0]?.image_url || post.image_url) ? <img src={post.slides?.[0]?.image_url || post.image_url} alt="" /> : post.video_url ? <Video size={20} /> : <ImageIcon size={20} />}
                  </span>
                  <span className="admin-v14370-review-main">
                    <small>{post.platform || t("admin.approvals.platformUnknown")} · {post.content_format || post.post_type || t("admin.approvals.post")}</small>
                    <strong>{post.brand_name || t("admin.approvals.unknownBrand")}</strong>
                    <em>{String(post.content || "").replace(/\s+/g, " ").slice(0, 120) || t("admin.approvals.noContent")}</em>
                  </span>
                  <span className="admin-v14370-review-time"><small>{t("admin.approvals.created")}</small><strong>{formatDate(post.created_at)}</strong></span>
                  <span className="admin-v14370-review-time"><small>{t("admin.approvals.scheduled")}</small><strong>{formatDate(post.scheduled_for)}</strong></span>
                  <span className={`admin-approval-status ${meta.className}`}><meta.Icon size={15} />{meta.label}</span>
                  <span className="admin-v14370-review-open">{t("admin.approvals.reviewPost")} <ChevronRight size={18} /></span>
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
                <div className="admin-v74-email-preview admin-review-workspace-main">
                  <div className="admin-v74-email-topline">{t("admin.approvals.reviewWorkspace")}</div>
                  <div className="admin-review-title-row">
                    <div>
                      <span>{selectedPost.post_type || selectedPost.content_format || t("admin.approvals.post")}</span>
                      <h3>{t("admin.approvals.qualityReview")}</h3>
                    </div>
                    <div className="admin-review-title-actions">
                      {!isCarouselPost(selectedPost) && materials[0]?.url ? (
                        <a className="admin-review-source-quick" href={materials[0].url} target="_blank" rel="noreferrer">
                          <ExternalLink size={15} /> {t("admin.approvals.openProductSource")}
                        </a>
                      ) : null}
                      {(isCarouselPost(selectedPost) || materials.length) ? (
                        <button type="button" className="admin-review-jump-products" onClick={() => document.getElementById(`admin-review-products-${selectedPost.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                          <PackageCheck size={15} /> {t("admin.approvals.editProducts")}
                        </button>
                      ) : null}
                      <span className="admin-review-post-id">{String(selectedPost.id || "").slice(0, 8)}</span>
                      {(editorDirty || productDirty) ? <span className="admin-review-unsaved">{t("admin.approvals.unsavedChanges")}</span> : null}
                    </div>
                  </div>

                  <div className="admin-review-quality-strip">
                    <div className={manualMaterialCount ? "warning" : materials.length && verifiedMaterialCount === materials.length ? "ok" : "neutral"}>
                      <ShieldCheck size={18} /><span>{t("admin.approvals.productIdentity")}</span><strong>{manualMaterialCount ? t("admin.approvals.identityWithManual", { verified: verifiedMaterialCount, manual: manualMaterialCount }) : materials.length ? `${verifiedMaterialCount}/${materials.length}` : t("admin.approvals.ready")}</strong>
                    </div>
                    <div className={lowResolutionMaterialCount ? "warning" : "ok"}>
                      <ImageIcon size={18} /><span>{t("admin.approvals.imageQuality")}</span><strong>{lowResolutionMaterialCount ? t("admin.approvals.lowResolution", { count: lowResolutionMaterialCount }) : t("admin.approvals.checked")}</strong>
                    </div>
                    <div className={lightboxItems.length ? "ok" : "neutral"}>
                      <PackageCheck size={18} /><span>{t("admin.approvals.media")}</span><strong>{lightboxItems.length ? t(lightboxItems.length === 1 ? "admin.approvals.oneImage" : "admin.approvals.imageCount", { count: lightboxItems.length }) : selectedPost.video_url ? t("admin.approvals.video") : t("admin.approvals.none")}</strong>
                    </div>
                    <div className={selectedPost.content ? "ok" : "warning"}>
                      <FileCheck2 size={18} /><span>{t("admin.approvals.postCopy")}</span><strong>{selectedPost.content ? t("admin.approvals.ready") : t("admin.approvals.missing")}</strong>
                    </div>
                  </div>

                  <MediaPreview post={selectedPost} t={t} onOpen={(index) => setLightboxIndex(index)} />

                  <section className="admin-review-copy-editor">
                    <div className="admin-review-section-heading">
                      <div><span>{t("admin.approvals.caption")}</span><strong>{t("admin.approvals.postCopy")}</strong></div>
                      <small>{t("admin.approvals.editCaptionHelp")}</small>
                    </div>
                    <textarea value={postCopy} onChange={(event) => { setPostCopy(event.target.value); markEditorDirty(); }} placeholder={t("admin.approvals.noContent")} />
                  </section>

                  {isCarouselPost(selectedPost) ? (
                    <section id={`admin-review-products-${selectedPost.id}`} className="admin-carousel-editor admin-review-product-workspace">
                      <div className="admin-carousel-editor-heading">
                        <div>
                          <span>{t("admin.approvals.productSource")}</span>
                          <strong>{t("admin.approvals.fiveProductSources")}</strong>
                          <p>{t("admin.approvals.productSourceHelp")}</p>
                        </div>
                        <b className={carouselReady ? "ready" : ""}>{materials.filter(isMaterialReady).length}/5</b>
                      </div>
                      <div className="admin-carousel-product-grid admin-review-product-grid">
                        {materials.map((item, index) => {
                          const verified = item.product_identity_locked === true && item.product_image_semantic_verified === true;
                          const width = Number(item.product_image_width || 0);
                          const height = Number(item.product_image_height || 0);
                          return (
                            <article className={isMaterialReady(item) ? "complete" : "empty"} key={`${selectedPost.id}-product-${index}`}>
                              <span className="admin-carousel-number">{index + 1}</span>
                              <button type="button" className="admin-carousel-clear" onClick={() => { setMaterials((items) => items.map((row, rowIndex) => rowIndex === index ? emptyCarouselProduct() : row)); markEditorDirty({ product: true }); }} aria-label={t("admin.approvals.removeProduct")}><X size={16} /></button>
                              <div className="admin-carousel-product-image admin-review-product-image">
                                {(item.image_url || item.preview_image_url) ? <img src={item.image_url || item.preview_image_url} alt="" /> : <ImageIcon size={28} />}
                                <span className={`admin-product-verification-badge ${item.manual_override ? "manual" : verified ? "verified" : "pending"}`}>
                                  {item.manual_override ? <Pencil size={13} /> : verified ? <ShieldCheck size={13} /> : <ScanSearch size={13} />}
                                  {item.manual_override ? t("admin.approvals.manualOverride") : verified ? t("admin.approvals.verifiedSource") : t("admin.approvals.fetchFromUrl")}
                                </span>
                              </div>
                              <div className="admin-carousel-product-fields admin-review-product-fields">
                                <label className="admin-product-url-field">
                                  <span>{t("admin.approvals.replaceProductUrl")}</span>
                                  <div>
                                    <Link2 size={15} />
                                    <input value={item.url || ""} placeholder="https://.../product" onChange={(event) => {
                                      const url = event.target.value;
                                      setMaterials((items) => items.map((row, rowIndex) => rowIndex === index ? { ...emptyCarouselProduct(), url } : row));
                                      markEditorDirty({ product: true });
                                    }} />
                                    <button type="button" disabled={!item.url?.trim() || resolvingProductIndex === index} onClick={() => resolveMaterialProduct(index)}>
                                      {resolvingProductIndex === index ? <LoaderCircle className="admin-spin" size={15} /> : <ScanSearch size={15} />}
                                      {item.title ? t("admin.approvals.refresh") : t("admin.approvals.fetch")}
                                    </button>
                                  </div>
                                </label>
                                {item.title ? (
                                  <div className="admin-product-facts">
                                    <div><span>{t("admin.approvals.brand")}</span><strong>{item.product_brand || "—"}</strong></div>
                                    <div><span>{t("admin.approvals.productName")}</span><strong>{item.title}</strong></div>
                                    <div><span>{t("admin.approvals.productType")}</span><strong>{item.product_display_type || "—"}</strong></div>
                                    <div><span>{t("admin.approvals.variant")}</span><strong>{item.product_color || "—"}</strong></div>
                                    <div><span>{t("admin.approvals.sku")}</span><strong>{item.product_identifier || "—"}</strong></div>
                                    <div><span>{t("admin.approvals.sourceImage")}</span><strong>{width && height ? `${width} × ${height}` : "—"}</strong></div>
                                  </div>
                                ) : <p className="admin-product-url-help">{t("admin.approvals.pasteProductUrl")}</p>}
                                <div className="admin-product-source-actions">
                                  {item.url ? <a className="admin-product-original-link" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t("admin.approvals.openOriginalProduct")}</a> : null}
                                  <button type="button" className="admin-product-manual-toggle" onClick={() => toggleManualEditor(index)}><Pencil size={14} /> {manualEditingIndices.includes(index) ? t("admin.approvals.closeManualEdit") : t("admin.approvals.editManually")}</button>
                                </div>
                                {renderManualProductEditor(item, index)}
                                <p className="admin-product-refresh-help">{t("admin.approvals.productRefreshHelp")}</p>
                              </div>
                            </article>
                          );
                        })}
                        <article className={`admin-carousel-outro ${outroSlide?.image_url && !outroRemoved ? "complete" : "empty"}`}>
                          <span className="admin-carousel-number">AI</span>
                          {outroSlide?.image_url && !outroRemoved ? <button type="button" className="admin-carousel-clear" onClick={() => { setOutroRemoved(true); markEditorDirty({ product: true }); }} aria-label={t("admin.approvals.replaceAiOutro")}><X size={16} /></button> : null}
                          <div className="admin-carousel-product-image">
                            {outroSlide?.image_url && !outroRemoved ? <img src={outroSlide.image_url} alt="" /> : <><Sparkles size={30} /><strong>{t("admin.approvals.newAiOutro")}</strong></>}
                          </div>
                        </article>
                      </div>
                      {regenerationError ? <div className="admin-alert error admin-regeneration-inline-alert"><AlertTriangle size={16} /> <span>{regenerationError}</span></div> : null}
                      {regenerationSuccess ? <div className="admin-alert success admin-regeneration-inline-alert"><CheckCircle2 size={16} /> <span>{regenerationSuccess}</span></div> : null}
                    </section>
                  ) : selectedPost.admin_product_items?.length || materials.length ? (
                    <section id={`admin-review-products-${selectedPost.id}`} className="admin-review-single-product">
                      <div className="admin-review-section-heading">
                        <div><span>{t("admin.approvals.productSource")}</span><strong>{t("admin.approvals.lockedProductObject")}</strong></div>
                        <small>{t("admin.approvals.singleProductSourceHelp")}</small>
                      </div>
                      {materials.slice(0, 1).map((item, index) => {
                        const verified = item.product_identity_locked === true && item.product_image_semantic_verified === true;
                        return (
                          <div className="admin-review-single-product-editor" key={`single-product-${index}`}>
                            <div className="admin-review-single-product-source">
                              <div className="admin-review-product-image">
                                {item.image_url ? <img src={item.image_url} alt="" /> : <ImageIcon size={30} />}
                                <span className={`admin-product-verification-badge ${item.manual_override ? "manual" : verified ? "verified" : "pending"}`}>
                                  {item.manual_override ? <Pencil size={13} /> : verified ? <ShieldCheck size={13} /> : <ScanSearch size={13} />}
                                  {item.manual_override ? t("admin.approvals.manualOverride") : verified ? t("admin.approvals.verifiedSource") : t("admin.approvals.fetchFromUrl")}
                                </span>
                              </div>
                              <label className="admin-product-url-field">
                                <span>{t("admin.approvals.replaceProductUrl")}</span>
                                <div>
                                  <Link2 size={15} />
                                  <input value={item.url || ""} placeholder="https://.../product" onChange={(event) => {
                                    const url = event.target.value;
                                    setMaterials([{ ...emptyCarouselProduct(), url }]);
                                    markEditorDirty({ product: true });
                                  }} />
                                  <button type="button" disabled={!item.url?.trim() || resolvingProductIndex === 0} onClick={() => resolveMaterialProduct(0)}>
                                    {resolvingProductIndex === 0 ? <LoaderCircle className="admin-spin" size={15} /> : <ScanSearch size={15} />}
                                    {item.title ? t("admin.approvals.refresh") : t("admin.approvals.fetch")}
                                  </button>
                                </div>
                              </label>
                            </div>
                            {item.title ? (
                              <div className="admin-product-facts admin-product-facts-single">
                                <div><span>{t("admin.approvals.brand")}</span><strong>{item.product_brand || "—"}</strong></div>
                                <div><span>{t("admin.approvals.productName")}</span><strong>{item.title || "—"}</strong></div>
                                <div><span>{t("admin.approvals.productType")}</span><strong>{item.product_display_type || "—"}</strong></div>
                                <div><span>{t("admin.approvals.variant")}</span><strong>{item.product_color || "—"}</strong></div>
                                <div><span>{t("admin.approvals.sku")}</span><strong>{item.product_identifier || "—"}</strong></div>
                                <div><span>{t("admin.approvals.sourceImage")}</span><strong>{item.product_image_width && item.product_image_height ? `${item.product_image_width} × ${item.product_image_height}` : "—"}</strong></div>
                              </div>
                            ) : <p className="admin-product-url-help">{t("admin.approvals.pasteProductUrl")}</p>}
                            <div className="admin-product-source-actions">
                              {item.url ? <a className="admin-product-original-link" href={item.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t("admin.approvals.openOriginalProduct")}</a> : null}
                              <button type="button" className="admin-product-manual-toggle" onClick={() => toggleManualEditor(index)}><Pencil size={14} /> {manualEditingIndices.includes(index) ? t("admin.approvals.closeManualEdit") : t("admin.approvals.editManually")}</button>
                            </div>
                            {renderManualProductEditor(item, index)}
                            <p className="admin-product-refresh-help">{t("admin.approvals.productRefreshHelp")}</p>
                            {regenerationError ? <div className="admin-alert error admin-regeneration-inline-alert"><AlertTriangle size={16} /> <span>{regenerationError}</span></div> : null}
                            {regenerationSuccess ? <div className="admin-alert success admin-regeneration-inline-alert"><CheckCircle2 size={16} /> <span>{regenerationSuccess}</span></div> : null}
                          </div>
                        );
                      })}
                    </section>
                  ) : null}
                </div>

                <aside className="admin-v74-detail-meta">
                  {(() => { const meta = statusMeta(selectedPost.status, t); return <span className={`admin-approval-status ${meta.className}`}><meta.Icon size={16} />{meta.label}</span>; })()}
                  <dl>
                    <div><dt>{t("admin.approvals.created")}</dt><dd>{formatDate(selectedPost.created_at)}</dd></div>
                    <div><dt>{t("admin.approvals.scheduled")}</dt><dd>{formatDate(selectedPost.scheduled_for)}</dd></div>
                    <div><dt>{t("admin.approvals.platform")}</dt><dd>{selectedPost.platform || "—"}</dd></div>
                  </dl>
                  <div className="admin-brand-review-policy admin-brand-review-policy-required">
                    <strong>{t("admin.approvals.brandReviewPolicy")}</strong>
                    <p>{t("admin.approvals.brandReviewPolicyText")}</p>
                    <span><CheckCircle2 size={15} /> {t("admin.approvals.requireBrandReview", { brandName: selectedPost.brand_name || t("admin.approvals.thisBrand") })}</span>
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

                  {!isSyntheticAdminCaseId(selectedPost.id) ? <button type="button" className="admin-archive-button" onClick={() => archiveSelected([selectedPost.id])}><Trash2 size={15} /> {t("admin.approvals.archivePost")}</button> : null}

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
              <footer className="admin-review-actionbar">
                <button type="button" className="admin-review-secondary-action" onClick={() => setSelectedPostId("")}><X size={16} /> {t("admin.approvals.close")}</button>
                <div>
                  {!isSyntheticAdminCaseId(selectedPost.id) ? (
                    <button type="button" className="admin-review-secondary-action" disabled={savingReviewChanges} onClick={saveCurrentReviewChanges}>
                      {savingReviewChanges ? <LoaderCircle className="admin-spin" size={16} /> : <Save size={16} />}
                      {t("admin.approvals.saveChanges")}
                    </button>
                  ) : null}
                  {isCarouselPost(selectedPost) ? (
                    <button type="button" className="admin-review-secondary-action admin-review-regenerate-action" disabled={regenerating || !carouselReady} onClick={regenerateFromMaterials}>
                      {regenerating ? <LoaderCircle className="admin-spin" size={16} /> : <RefreshCw size={16} />}
                      {t("admin.approvals.regenerateCarousel")}
                    </button>
                  ) : selectedPost.admin_product_items?.length || materials.length ? (
                    <button type="button" className="admin-review-secondary-action admin-review-regenerate-action" disabled={regenerating || !singleProductReady} onClick={regenerateSingleProduct}>
                      {regenerating ? <LoaderCircle className="admin-spin" size={16} /> : <RefreshCw size={16} />}
                      {t("admin.approvals.regenerateProduct")}
                    </button>
                  ) : null}
                  {productDirty ? <span className="admin-review-regeneration-required"><AlertTriangle size={14} /> {t("admin.approvals.regenerationRequired")}</span> : editorDirty ? <span className="admin-review-regeneration-required"><AlertTriangle size={14} /> {t("admin.approvals.saveBeforeApproval")}</span> : null}
                  {selectedPost.status === "pending_approval" && !["approved_by_spreelo", "released", "not_required", "archived"].includes(String(selectedPost.admin_review_status || "").toLowerCase()) ? (
                    <button type="button" className="admin-primary-button admin-review-approve-action" disabled={releasingPostId === selectedPost.id || productDirty || editorDirty} onClick={() => releaseToCustomer(selectedPost.id)}>
                      {releasingPostId === selectedPost.id ? <LoaderCircle className="admin-spin" size={16} /> : <CheckCircle2 size={16} />}
                      {t("admin.approvals.releaseToCustomer")}
                    </button>
                  ) : null}
                </div>
              </footer>
            </section>
          </div>
        ) : null}

        {lightboxIndex !== null && lightboxItems[lightboxIndex] ? (
          <div className="admin-review-lightbox-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setLightboxIndex(null); }}>
            <section className="admin-review-lightbox" role="dialog" aria-modal="true" aria-label={t("admin.approvals.largeImageReview")}>
            <header>
              <div>
                <span>{selectedPost?.brand_name || "Spreelo"}</span>
                <strong>{lightboxItems[lightboxIndex].label}</strong>
                <small>{lightboxIndex + 1} / {lightboxItems.length}</small>
              </div>
              <div>
                {lightboxItems[lightboxIndex].productUrl ? <a href={lightboxItems[lightboxIndex].productUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> {t("admin.approvals.originalProduct")}</a> : null}
                <button type="button" onClick={() => setLightboxIndex(null)} aria-label={t("admin.approvals.closeImage")}><X size={21} /></button>
              </div>
            </header>
            <div className="admin-review-lightbox-stage">
              {lightboxItems.length > 1 ? <button type="button" className="previous" onClick={() => setLightboxIndex((lightboxIndex - 1 + lightboxItems.length) % lightboxItems.length)} aria-label={t("admin.approvals.previousImage")}><ChevronLeft size={26} /></button> : null}
              <img src={lightboxItems[lightboxIndex].url} alt="" />
              {lightboxItems.length > 1 ? <button type="button" className="next" onClick={() => setLightboxIndex((lightboxIndex + 1) % lightboxItems.length)} aria-label={t("admin.approvals.nextImage")}><ChevronRight size={26} /></button> : null}
            </div>
            <footer><span>{t("admin.approvals.lightboxHelp")}</span><strong><ZoomIn size={15} /> {t("admin.approvals.largePreview")}</strong></footer>
            </section>
          </div>
        ) : null}
      </div>
    </AppLayout>
  );
}
