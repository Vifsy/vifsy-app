import crypto from "crypto";
import OpenAI from "openai";
import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { buildProductContentContract } from "../../../../../lib/productEngineV2";
import {
  applyLogoOverlayIfNeeded,
  generateAnimatedProductVideo,
  generateLockedProductPostContentForUse,
  generateWebsiteItemAdImage,
  getCarouselProductLabelPresentation,
  renderCarouselProductSlideImage,
  resolveLockedProductUrlForUse,
  shouldUseLogoForRule,
} from "../../../cron/run-automations/route.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function normalizeProduct(product, productUrl) {
  return {
    title: product?.title || "",
    description: product?.description || product?.reason || "",
    url: product?.url || productUrl,
    image_url: product?.image_url || "",
    preview_image_url: "",
    product_brand: product?.product_brand || product?.locked_product_brand || "",
    product_identifier: product?.product_identifier || product?.locked_product_identifier || "",
    product_display_type:
      product?.product_display_type ||
      product?.display_product_type ||
      product?.locked_product_category ||
      product?.category ||
      "",
    product_color: product?.product_color || product?.locked_product_color || "",
    product_image_width: Number(product?.product_image_width || 0) || null,
    product_image_height: Number(product?.product_image_height || 0) || null,
    product_identity_locked: product?.product_identity_locked === true,
    product_image_semantic_verified: product?.product_image_semantic_verified === true,
    locked_product_fingerprint: product?.locked_product_fingerprint || "",
  };
}

async function uploadPng(admin, { userId, postId, suffix, imageBase64 }) {
  const path = `${userId}/${postId}-${suffix}-${crypto.randomUUID()}.png`;
  const upload = await admin.storage.from("post-images").upload(
    path,
    Buffer.from(imageBase64, "base64"),
    { contentType: "image/png", upsert: false }
  );
  if (upload.error) throw new Error(upload.error.message || "Could not save regenerated image");
  const { data } = admin.storage.from("post-images").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not create public URL for regenerated image");
  return { imageUrl: data.publicUrl, imageStoragePath: path };
}

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const body = await request.json().catch(() => ({}));
  const postId = String(body?.post_id || "").trim();
  const productUrl = String(body?.product_url || "").trim();
  if (!postId || !productUrl || !/^https?:\/\//i.test(productUrl)) {
    return Response.json(
      { ok: false, error: "A post ID and complete original product URL are required." },
      { status: 400 }
    );
  }

  const { data: post, error: postError } = await context.admin
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (postError || !post) {
    return Response.json({ ok: false, error: postError?.message || "Post not found." }, { status: 404 });
  }

  const { data: rule } = post.automation_rule_id
    ? await context.admin.from("automation_rules").select("*").eq("id", post.automation_rule_id).maybeSingle()
    : { data: null };
  const brandProfileId = post.brand_profile_id || rule?.brand_profile_id || null;
  const { data: brandProfile } = brandProfileId
    ? await context.admin.from("brand_profiles").select("*").eq("id", brandProfileId).maybeSingle()
    : { data: null };
  const websiteUrl = String(
    brandProfile?.website_product_source_url || brandProfile?.website_url || productUrl
  ).trim();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const lockedProduct = await resolveLockedProductUrlForUse({
      supabase: context.admin,
      openai,
      productUrl,
      websiteUrl,
      titleHint: "",
      rule: rule || { id: post.automation_rule_id || "admin-product-regeneration", brand_profile_id: brandProfileId },
      ruleId: post.automation_rule_id || "admin-product-regeneration",
    });
    const product = normalizeProduct(lockedProduct, productUrl);
    const enhancedRule = {
      ...(rule || {}),
      id: rule?.id || post.automation_rule_id || `admin-${post.id}`,
      user_id: post.user_id,
      brand_profile_id: brandProfileId,
      brand_profile: brandProfile || null,
      content_type_id: rule?.content_type_id || post.post_type || "website_item",
      content_format: post.content_format || rule?.content_format || "single_image",
      language: post.language || rule?.language || brandProfile?.content_language || "English",
      tone: post.tone || rule?.tone || "Professional",
      platform: post.platform || rule?.platform || "Instagram",
      uses_website_content: true,
      generate_image: true,
      website_item: lockedProduct,
      website_items: [],
      website_reserve_items: [],
      product_content_contract: buildProductContentContract([lockedProduct], []),
    };

    const generatedContent = await generateLockedProductPostContentForUse(openai, enhancedRule);
    if (!generatedContent) throw new Error("Spreelo could not regenerate the post copy for this product.");

    const isAnimated = String(enhancedRule.content_format || "").toLowerCase() === "animated_video";
    const isAiProductAd = String(enhancedRule.content_type_id || "") === "website_item_text_ad";
    const includeLogo = shouldUseLogoForRule(enhancedRule, brandProfile);
    const now = new Date().toISOString();
    let imageUrl = null;
    let imageStoragePath = null;
    let imagePrompt = null;
    let videoUrl = null;
    let videoStoragePath = null;
    let videoRenderId = null;

    if (isAnimated) {
      await context.admin.from("posts").update({
        content: generatedContent,
        admin_product_items: [product],
        image_status: "generating",
        video_status: "rendering",
        admin_review_status: "pending",
        updated_at: now,
      }).eq("id", post.id);

      const rendered = await generateAnimatedProductVideo({
        openai,
        supabase: context.admin,
        rule: enhancedRule,
        postContent: generatedContent,
        userId: post.user_id,
        postId: post.id,
      });
      imageUrl = rendered.posterUrl;
      imageStoragePath = rendered.posterStoragePath;
      imagePrompt = rendered.foregroundPrompt;
      videoUrl = rendered.videoUrl;
      videoStoragePath = rendered.videoStoragePath;
      videoRenderId = rendered.renderId;
    } else if (isAiProductAd) {
      const generated = await generateWebsiteItemAdImage(openai, enhancedRule, generatedContent);
      const uploaded = await uploadPng(context.admin, {
        userId: post.user_id,
        postId: post.id,
        suffix: "admin-product-ad",
        imageBase64: generated.imageBase64,
      });
      imageUrl = uploaded.imageUrl;
      imageStoragePath = uploaded.imageStoragePath;
      imagePrompt = generated.imagePrompt;
      const logoResult = await applyLogoOverlayIfNeeded({
        supabase: context.admin,
        userId: post.user_id,
        postId: post.id,
        imageUrl,
        imageStoragePath,
        brandProfile,
        includeLogo,
      });
      if (logoResult?.imageUrl) {
        imageUrl = logoResult.imageUrl;
        imageStoragePath = logoResult.imageStoragePath || imageStoragePath;
      }
    } else {
      const presentation = getCarouselProductLabelPresentation(lockedProduct, lockedProduct.title);
      const rendered = await renderCarouselProductSlideImage({
        sourceImageUrl: lockedProduct.image_url,
        supabase: context.admin,
        rule: enhancedRule,
        productTitle: presentation.title,
        productBrand: presentation.brand,
        productDescriptor: presentation.descriptor,
        includeLogo,
        languageHint: enhancedRule.language,
      });
      const uploaded = await uploadPng(context.admin, {
        userId: post.user_id,
        postId: post.id,
        suffix: "admin-product-post",
        imageBase64: rendered.imageBase64,
      });
      imageUrl = uploaded.imageUrl;
      imageStoragePath = uploaded.imageStoragePath;
      imagePrompt = "Verified product-page image rendered with Spreelo product identity label.";
      const logoResult = await applyLogoOverlayIfNeeded({
        supabase: context.admin,
        userId: post.user_id,
        postId: post.id,
        imageUrl,
        imageStoragePath,
        brandProfile,
        includeLogo,
      });
      if (logoResult?.imageUrl) {
        imageUrl = logoResult.imageUrl;
        imageStoragePath = logoResult.imageStoragePath || imageStoragePath;
      }
    }

    const updatePayload = {
      content: generatedContent,
      image_url: imageUrl,
      image_storage_path: imageStoragePath,
      image_status: imageUrl ? "ready" : "none",
      image_prompt: imagePrompt,
      admin_product_items: [product],
      status: "pending_approval",
      admin_review_status: "pending",
      include_logo: includeLogo,
      logo_url: includeLogo ? brandProfile?.logo_url || null : null,
      updated_at: new Date().toISOString(),
    };
    if (isAnimated) {
      Object.assign(updatePayload, {
        video_url: videoUrl,
        video_storage_path: videoStoragePath,
        video_render_id: videoRenderId,
        video_status: videoUrl ? "ready" : "failed",
        video_error: null,
      });
    }
    const update = await context.admin.from("posts").update(updatePayload).eq("id", post.id);
    if (update.error) throw new Error(update.error.message || "Could not save regenerated product post.");

    // A single-product post has no carousel slide rows; remove stale rows only
    // if this post had been converted from another format in admin.
    if (!isAnimated && String(post.content_format || "").toLowerCase() !== "carousel") {
      await context.admin.from("post_slides").delete().eq("post_id", post.id);
    }

    try {
      await context.admin.from("admin_review_cases").upsert({
        post_id: post.id,
        user_id: post.user_id,
        brand_profile_id: brandProfileId,
        automation_rule_id: post.automation_rule_id || null,
        status: "awaiting_spreelo",
        draft_content: generatedContent,
        product_items: [product],
        needs_review: true,
        failure_code: null,
        failure_stage: null,
        failure_message: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "post_id" });
    } catch {
      // Older databases may not have the optional review-case table yet. The
      // post itself remains the authoritative admin review record.
    }

    return Response.json({
      ok: true,
      post_id: post.id,
      product,
      content: generatedContent,
      image_url: imageUrl,
      video_url: videoUrl,
      format: isAnimated ? "animated_product_reel" : isAiProductAd ? "ai_product_ad" : "product_post",
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Spreelo could not regenerate this product post." },
      { status: 422 }
    );
  }
}
