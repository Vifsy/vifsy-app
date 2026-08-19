import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { snapshotAdminPostVersion } from "../../../../../lib/adminPostVersions";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);
  const body = await request.json().catch(() => ({}));
  const postId = String(body?.post_id || "").trim();
  const versionId = String(body?.version_id || "").trim();
  if (!postId || !versionId) {
    return Response.json({ ok: false, error: "Post ID and version ID are required." }, { status: 400 });
  }

  const [{ data: post, error: postError }, { data: version, error: versionError }] = await Promise.all([
    context.admin.from("posts").select("*").eq("id", postId).maybeSingle(),
    context.admin.from("admin_post_versions").select("*").eq("id", versionId).eq("post_id", postId).maybeSingle(),
  ]);
  if (postError || !post) return Response.json({ ok: false, error: postError?.message || "Post not found." }, { status: 404 });
  if (versionError || !version) return Response.json({ ok: false, error: versionError?.message || "Version not found." }, { status: 404 });

  await snapshotAdminPostVersion(context.admin, postId, {
    reason: `before_restore_version_${version.version_number}`,
    createdBy: context.user.id,
  });

  const now = new Date().toISOString();
  const update = await context.admin.from("posts").update({
    content: version.content || "",
    image_url: version.image_url || null,
    video_url: version.video_url || null,
    content_format: version.content_format || post.content_format,
    website_url: version.website_url || post.website_url || null,
    admin_product_items: Array.isArray(version.product_items) ? version.product_items : [],
    status: "pending_approval",
    admin_review_status: "pending",
    admin_reviewed_at: null,
    admin_review_note: null,
    image_status: version.image_url ? "ready" : "none",
    video_status: version.video_url ? "ready" : "none",
    video_error: null,
    updated_at: now,
  }).eq("id", postId);
  if (update.error) return Response.json({ ok: false, error: update.error.message }, { status: 500 });

  const oldSlides = await context.admin.from("post_slides").select("*").eq("post_id", postId).order("slide_order", { ascending: true });
  const deleteSlides = await context.admin.from("post_slides").delete().eq("post_id", postId);
  if (deleteSlides.error) return Response.json({ ok: false, error: deleteSlides.error.message }, { status: 500 });

  if (Array.isArray(version.slides) && version.slides.length) {
    const restoredSlides = version.slides.map((slide) => ({
      user_id: post.user_id,
      post_id: postId,
      slide_order: slide.slide_order,
      slide_type: slide.slide_type || "content",
      headline: slide.headline || null,
      body: slide.body || null,
      cta_text: slide.cta_text || null,
      image_url: slide.image_url || null,
      product_url: slide.product_url || null,
      logo_enabled: slide.logo_enabled === true,
      metadata: { ...(slide.metadata || {}), admin_restored_version: version.version_number },
    }));
    const insertSlides = await context.admin.from("post_slides").insert(restoredSlides);
    if (insertSlides.error) {
      if (oldSlides.data?.length) await context.admin.from("post_slides").insert(oldSlides.data);
      return Response.json({ ok: false, error: insertSlides.error.message }, { status: 500 });
    }
  }

  await snapshotAdminPostVersion(context.admin, postId, {
    reason: `restored_version_${version.version_number}`,
    createdBy: context.user.id,
  });

  return Response.json({ ok: true, post_id: postId, restored_version: version.version_number });
}
