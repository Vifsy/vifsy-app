export async function snapshotAdminPostVersion(admin, postId, { reason = "admin_snapshot", createdBy = null } = {}) {
  if (!admin || !postId) return null;
  try {
    const [{ data: post, error: postError }, { data: slides, error: slidesError }, { data: previous }] = await Promise.all([
      admin.from("posts").select("id, content, image_url, video_url, content_format, website_url, admin_product_items").eq("id", postId).maybeSingle(),
      admin.from("post_slides").select("slide_order, slide_type, headline, body, cta_text, image_url, product_url, logo_enabled, metadata").eq("post_id", postId).order("slide_order", { ascending: true }),
      admin.from("admin_post_versions").select("version_number").eq("post_id", postId).order("version_number", { ascending: false }).limit(1),
    ]);
    if (postError || !post) return null;
    if (slidesError && !/post_slides|schema cache|does not exist/i.test(String(slidesError.message || ""))) return null;

    const versionNumber = Math.max(0, Number(previous?.[0]?.version_number || 0)) + 1;
    const { data, error } = await admin.from("admin_post_versions").insert({
      post_id: postId,
      version_number: versionNumber,
      reason,
      content: post.content || null,
      image_url: post.image_url || null,
      video_url: post.video_url || null,
      content_format: post.content_format || null,
      website_url: post.website_url || null,
      product_items: Array.isArray(post.admin_product_items) ? post.admin_product_items : [],
      slides: Array.isArray(slides) ? slides : [],
      created_by: createdBy || null,
    }).select("id, post_id, version_number, reason, created_at").single();

    if (error) {
      if (!/admin_post_versions|schema cache|does not exist/i.test(String(error.message || ""))) {
        console.warn("Admin post version snapshot failed", { postId, message: error.message });
      }
      return null;
    }
    return data;
  } catch (error) {
    if (!/admin_post_versions|schema cache|does not exist/i.test(String(error?.message || ""))) {
      console.warn("Admin post version snapshot unavailable", { postId, message: error?.message || String(error) });
    }
    return null;
  }
}
