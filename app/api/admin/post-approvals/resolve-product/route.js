import OpenAI from "openai";
import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { resolveLockedProductUrlForUse } from "../../../cron/run-automations/route.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const body = await request.json().catch(() => ({}));
  const productUrl = String(body?.product_url || "").trim();
  const postId = String(body?.post_id || "").trim();
  const occurrenceId = String(body?.occurrence_id || "").trim();
  if (!productUrl || !/^https?:\/\//i.test(productUrl)) {
    return Response.json({ ok: false, error: "Paste a complete product URL first." }, { status: 400 });
  }

  let post = null;
  let occurrence = null;
  if (postId) {
    const result = await context.admin
      .from("posts")
      .select("id, brand_profile_id, automation_rule_id")
      .eq("id", postId)
      .maybeSingle();
    if (result.error) return Response.json({ ok: false, error: result.error.message }, { status: 500 });
    post = result.data;
  }
  if (!post && occurrenceId) {
    const result = await context.admin
      .from("automation_occurrences")
      .select("id, brand_profile_id, automation_rule_id")
      .eq("id", occurrenceId)
      .maybeSingle();
    if (result.error) return Response.json({ ok: false, error: result.error.message }, { status: 500 });
    occurrence = result.data;
  }

  const ruleId = post?.automation_rule_id || occurrence?.automation_rule_id || null;
  const brandProfileId = post?.brand_profile_id || occurrence?.brand_profile_id || null;
  const { data: rule } = ruleId
    ? await context.admin.from("automation_rules").select("*").eq("id", ruleId).maybeSingle()
    : { data: null };
  const { data: brand } = brandProfileId
    ? await context.admin
        .from("brand_profiles")
        .select("business_name, website_url, website_product_source_url")
        .eq("id", brandProfileId)
        .maybeSingle()
    : { data: null };

  const websiteUrl = String(
    brand?.website_product_source_url || brand?.website_url || productUrl
  ).trim();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const product = await resolveLockedProductUrlForUse({
      supabase: context.admin,
      openai,
      productUrl,
      websiteUrl,
      titleHint: String(body?.title_hint || "").trim(),
      rule: rule || { id: "admin-product-replacement", brand_profile_id: brandProfileId },
      ruleId: ruleId || "admin-product-replacement",
    });

    return Response.json({
      ok: true,
      product: {
        title: product.title || "",
        description: product.description || product.reason || "",
        url: product.url || productUrl,
        image_url: product.image_url || "",
        preview_image_url: "",
        product_brand: product.product_brand || product.locked_product_brand || "",
        product_identifier: product.product_identifier || product.locked_product_identifier || "",
        product_display_type: product.product_display_type || product.display_product_type || product.locked_product_category || product.category || "",
        product_color: product.product_color || product.locked_product_color || "",
        product_image_width: Number(product.product_image_width || 0) || null,
        product_image_height: Number(product.product_image_height || 0) || null,
        product_identity_locked: product.product_identity_locked === true,
        product_image_semantic_verified: product.product_image_semantic_verified === true,
        locked_product_fingerprint: product.locked_product_fingerprint || "",
      },
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Spreelo could not verify that product URL." },
      { status: 422 }
    );
  }
}
