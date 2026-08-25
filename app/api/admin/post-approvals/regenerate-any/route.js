import crypto from "crypto";
import OpenAI from "openai";
import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { snapshotAdminPostVersion } from "../../../../../lib/adminPostVersions";
import { createGenerationCostTracker, wrapOpenAIForCostTracking } from "../../../../../lib/generationCostTracking";
import { resolveContentLanguagePreference } from "../../../../../lib/contentLanguage";
import {
  applyLogoOverlayIfNeeded,
  createEmergencySocialCardUpload,
  generateAutomationImage,
  generateLockedProductPostContentForUse,
  prepareFocusedPageContextForRule,
  shouldUseLogoForRule,
} from "../../../cron/run-automations/route.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function cleanUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function normalizeMode(value) {
  return ["all", "text", "media"].includes(String(value || ""))
    ? String(value)
    : "all";
}

function isProductDriven(rule, source) {
  const type = String(rule?.content_type_id || source?.post_type || source?.content_type_label || "").toLowerCase();
  const format = String(source?.content_format || rule?.content_format || "").toLowerCase();
  return (
    ["website_item", "website_item_text_ad", "animated_website_item", "carousel_website_item"].includes(type) ||
    /product|website_item|carousel/.test(type) ||
    /carousel/.test(format)
  );
}

async function uploadPng(admin, { userId, postId, imageBase64 }) {
  const path = `${userId}/${postId}-admin-regenerated-${crypto.randomUUID()}.png`;
  const upload = await admin.storage.from("post-images").upload(
    path,
    Buffer.from(imageBase64, "base64"),
    { contentType: "image/png", upsert: false }
  );
  if (upload.error) throw new Error(upload.error.message || "Could not save regenerated image.");
  const { data } = admin.storage.from("post-images").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not create public URL for regenerated image.");
  return { imageUrl: data.publicUrl, imageStoragePath: path };
}

async function loadSource(context, { postId, occurrenceId, reviewCaseId }) {
  let post = null;
  let occurrence = null;
  let reviewCase = null;

  if (postId) {
    const result = await context.admin.from("posts").select("*").eq("id", postId).maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message || "Post not found.");
    post = result.data;
  }
  if (reviewCaseId) {
    const result = await context.admin.from("admin_review_cases").select("*").eq("id", reviewCaseId).maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message || "Review case not found.");
    reviewCase = result.data;
  }

  const resolvedOccurrenceId = occurrenceId || reviewCase?.occurrence_id || "";
  if (resolvedOccurrenceId) {
    const result = await context.admin.from("automation_occurrences").select("*").eq("id", resolvedOccurrenceId).maybeSingle();
    if (result.error || !result.data) throw new Error(result.error?.message || "Generation occurrence not found.");
    occurrence = result.data;
  }

  const source = post || occurrence || reviewCase;
  if (!source) throw new Error("The generation could not be loaded.");
  return { post, occurrence, reviewCase, source, occurrenceId: resolvedOccurrenceId };
}

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const body = await request.json().catch(() => ({}));
  const postId = String(body?.post_id || "").trim();
  const occurrenceId = String(body?.occurrence_id || "").trim();
  const reviewCaseId = String(body?.review_case_id || "").trim();
  const mode = normalizeMode(body?.mode);
  const requestedSourceUrl = cleanUrl(body?.source_url);

  if (!postId && !occurrenceId && !reviewCaseId) {
    return Response.json({ ok: false, error: "A post, occurrence or review-case ID is required." }, { status: 400 });
  }

  try {
    let { post, occurrence, reviewCase, source, occurrenceId: resolvedOccurrenceId } = await loadSource(context, {
      postId,
      occurrenceId,
      reviewCaseId,
    });

    const ruleId = post?.automation_rule_id || occurrence?.automation_rule_id || reviewCase?.automation_rule_id || null;
    if (!ruleId) throw new Error("The original automation recipe is missing.");

    const { data: rule, error: ruleError } = await context.admin
      .from("automation_rules")
      .select("*")
      .eq("id", ruleId)
      .maybeSingle();
    if (ruleError || !rule) throw new Error(ruleError?.message || "The original automation recipe could not be loaded.");

    const brandProfileId = post?.brand_profile_id || occurrence?.brand_profile_id || reviewCase?.brand_profile_id || rule.brand_profile_id || null;
    const { data: brandProfile } = brandProfileId
      ? await context.admin.from("brand_profiles").select("*").eq("id", brandProfileId).maybeSingle()
      : { data: null };

    if (isProductDriven(rule, source)) {
      return Response.json(
        { ok: false, error: "This is a product-driven format. Use the product material editor before regenerating it." },
        { status: 409 }
      );
    }

    const userId = post?.user_id || occurrence?.user_id || reviewCase?.user_id || rule.user_id;
    if (!userId) throw new Error("The customer account for this generation is missing.");

    const sourceUrl = requestedSourceUrl || cleanUrl(post?.website_url) || cleanUrl(rule.content_source_url) || cleanUrl(rule.website_url) || cleanUrl(brandProfile?.website_url);
    const effectiveLanguage = resolveContentLanguagePreference({
      requestedLanguage: rule?.language,
      analyzedLanguage: brandProfile?.content_language,
      websiteUrl: brandProfile?.website_url || sourceUrl || rule?.website_url || "",
      fallback: post?.language || "English",
    });
    const enhancedRule = {
      ...rule,
      language: effectiveLanguage,
      content_language: effectiveLanguage,
      user_id: userId,
      brand_profile_id: brandProfileId,
      brand_profile: brandProfile || null,
      content_source_url: sourceUrl || rule.content_source_url || null,
      website_url: sourceUrl || rule.website_url || brandProfile?.website_url || null,
    };

    if (sourceUrl) {
      const focused = await prepareFocusedPageContextForRule(enhancedRule);
      if (focused) enhancedRule.focused_page_context = focused;
    }

    if (post?.id) {
      await snapshotAdminPostVersion(context.admin, post.id, {
        reason: `before_admin_regeneration_${mode}`,
        createdBy: context.user.id,
      });
    }

    const costTracker = createGenerationCostTracker({
      supabase: context.admin,
      occurrenceId: resolvedOccurrenceId || null,
      postId: post?.id || null,
    });
    const openai = wrapOpenAIForCostTracking(
      new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      () => costTracker
    );
    const existingContent = String(body?.content || post?.content || reviewCase?.draft_content || "").trim();
    let generatedContent = existingContent;
    if (mode !== "media") {
      generatedContent = await generateLockedProductPostContentForUse(openai, enhancedRule);
      if (!generatedContent) throw new Error("Spreelo could not regenerate the post text.");
    } else if (!generatedContent) {
      generatedContent = await generateLockedProductPostContentForUse(openai, enhancedRule);
    }

    const now = new Date().toISOString();
    const contentFormat = post?.content_format || occurrence?.content_format || reviewCase?.content_format || rule.content_format || "single_image";
    const wantsImage = mode !== "text" && Boolean(
      post?.image_url ||
      rule.generate_image
    );

    if (!post) {
      const insert = await context.admin.from("posts").insert({
        user_id: userId,
        brand_profile_id: brandProfileId,
        automation_rule_id: ruleId,
        content: generatedContent,
        platform: rule.platform || "instagram",
        tone: rule.tone || null,
        language: effectiveLanguage,
        post_type: rule.post_type || reviewCase?.content_type_label || occurrence?.content_type_label || "Post",
        content_format: contentFormat,
        website_url: sourceUrl || null,
        source: "automation_admin_repair",
        source_label: "Regenerated in Spreelo admin from original automation recipe",
        status: "generating",
        approval_required: true,
        approval_token: crypto.randomBytes(32).toString("hex"),
        admin_review_status: "pending",
        scheduled_for: occurrence?.scheduled_for || reviewCase?.scheduled_for || now,
        image_status: wantsImage ? "generating" : "none",
        video_status: "none",
        created_at: now,
        updated_at: now,
      }).select("*").single();
      if (insert.error || !insert.data) throw new Error(insert.error?.message || "Could not create repaired post.");
      post = insert.data;
      try { await costTracker.bindPost(post.id); } catch {}
    }

    let imageUrl = mode === "text" ? post.image_url || null : post.image_url || null;
    let imageStoragePath = post.image_storage_path || null;
    let imagePrompt = post.image_prompt || null;
    let tiktokCleanImageUrl = null;
    let tiktokCleanImageStoragePath = null;

    let includeLogo = shouldUseLogoForRule(enhancedRule, brandProfile);
    if (wantsImage) {
      const imageSource = String(enhancedRule.image_source || "").trim().toLowerCase();
      if (imageSource === "uploaded" && enhancedRule.uploaded_image_url) {
        // Match the first-run intent: a customer-uploaded source image is kept
        // as the source rather than replaced by a newly invented AI image.
        imageUrl = enhancedRule.uploaded_image_url;
        imageStoragePath = null;
        imagePrompt = "Customer-uploaded image reused during admin regeneration.";
        includeLogo = false;
      } else {
        try {
          const generated = await generateAutomationImage(openai, enhancedRule, generatedContent);
          const uploaded = await uploadPng(context.admin, {
            userId,
            postId: post.id,
            imageBase64: generated.imageBase64,
          });
          imageUrl = uploaded.imageUrl;
          imageStoragePath = uploaded.imageStoragePath;
          imagePrompt = generated.imagePrompt;
          tiktokCleanImageUrl = imageUrl;
          tiktokCleanImageStoragePath = imageStoragePath;

          const logoResult = await applyLogoOverlayIfNeeded({
            supabase: context.admin,
            userId,
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
        } catch (imageError) {
          // Use the same deterministic delivery fallback as the automatic
          // pipeline so a transient image-provider failure does not make an
          // otherwise repairable admin regeneration dead-end.
          const fallback = await createEmergencySocialCardUpload({
            supabase: context.admin,
            rule: enhancedRule,
            brandProfile,
            content: generatedContent,
            postId: post.id,
            fileSuffix: "admin-delivery-fallback",
          });
          imageUrl = fallback.imageUrl;
          imageStoragePath = fallback.imageStoragePath;
          imagePrompt = `Local deterministic delivery fallback after AI image failure: ${String(imageError?.message || "unknown error").slice(0, 280)}`;
        }
      }
    }

    const existingPublishSettings = post.platform_publish_settings && typeof post.platform_publish_settings === "object" ? post.platform_publish_settings : {};
    const existingTikTokSettings = existingPublishSettings.tiktok && typeof existingPublishSettings.tiktok === "object" ? existingPublishSettings.tiktok : {};
    const updatePayload = {
      content: generatedContent,
      website_url: sourceUrl || post.website_url || null,
      status: "pending_approval",
      admin_review_status: "pending",
      admin_reviewed_at: null,
      admin_review_note: null,
      image_url: imageUrl,
      image_storage_path: imageStoragePath,
      image_prompt: imagePrompt,
      image_status: imageUrl ? "ready" : "none",
      video_error: null,
      include_logo: includeLogo,
      logo_url: includeLogo ? brandProfile?.logo_url || null : null,
      ...(tiktokCleanImageUrl && String(post.platform || "").toLowerCase().includes("tiktok") ? {
        platform_publish_settings: {
          ...existingPublishSettings,
          tiktok: {
            ...existingTikTokSettings,
            media_overrides: {
              ...(existingTikTokSettings.media_overrides || {}),
              image_url: tiktokCleanImageUrl,
              image_storage_path: tiktokCleanImageStoragePath || null,
              source: "admin_pre_logo_clean_media",
            },
          },
        },
      } : {}),
      updated_at: new Date().toISOString(),
    };
    const update = await context.admin.from("posts").update(updatePayload).eq("id", post.id);
    if (update.error) throw new Error(update.error.message || "Could not save regenerated post.");

    if (resolvedOccurrenceId) {
      await context.admin.from("automation_occurrences").update({
        post_id: post.id,
        metadata: {
          ...(occurrence?.metadata || {}),
          admin_regenerated_at: new Date().toISOString(),
          admin_regeneration_mode: mode,
          admin_source_url: sourceUrl || null,
        },
      }).eq("id", resolvedOccurrenceId);
    }

    const reviewPayload = {
      occurrence_id: resolvedOccurrenceId || null,
      post_id: post.id,
      user_id: userId,
      brand_profile_id: brandProfileId,
      automation_rule_id: ruleId,
      status: "awaiting_spreelo",
      draft_content: generatedContent,
      needs_review: true,
      failure_code: null,
      failure_stage: null,
      failure_message: null,
      updated_at: new Date().toISOString(),
    };
    if (reviewCaseId) {
      await context.admin.from("admin_review_cases").update(reviewPayload).eq("id", reviewCaseId);
    } else {
      await context.admin.from("admin_review_cases").upsert(
        reviewPayload,
        { onConflict: resolvedOccurrenceId ? "occurrence_id" : "post_id" }
      );
    }

    await snapshotAdminPostVersion(context.admin, post.id, {
      reason: `after_admin_regeneration_${mode}`,
      createdBy: context.user.id,
    });

    return Response.json({
      ok: true,
      post_id: post.id,
      content: generatedContent,
      image_url: imageUrl,
      source_url: sourceUrl || null,
      mode,
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Spreelo could not regenerate this post." },
      { status: 422 }
    );
  }
}
