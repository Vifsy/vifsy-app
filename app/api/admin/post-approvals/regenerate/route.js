import crypto from "crypto";
import OpenAI from "openai";
import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { generateCarouselOutroSlideImage, getCarouselProductLabelPresentation, renderCarouselProductSlideImage } from "../../../cron/run-automations/route.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);
  const body = await request.json().catch(() => ({}));
  const requestedPostId = String(body?.post_id || "").trim();
  const occurrenceId = String(body?.occurrence_id || "").trim();
  const products = (Array.isArray(body?.product_items) ? body.product_items : [])
    .map((item) => ({
      title: String(item?.title || "").trim(),
      description: String(item?.description || "").trim(),
      url: String(item?.url || "").trim(),
      image_url: String(item?.image_url || "").trim(),
      product_brand: String(item?.product_brand || item?.brand || "").trim(),
      product_display_type: String(item?.product_display_type || "").trim(),
      product_color: String(item?.product_color || item?.color || "").trim(),
    }))
    .filter((item) => item.title || item.image_url || item.url || item.description)
    .slice(0, 5);
  if (
    products.length !== 5 ||
    products.some((item) => !item.image_url || !item.title || !item.url)
  ) {
    return Response.json({
      ok: false,
      error: "A carousel must contain exactly five products. Each product only needs a product image, product text/name and product link. Product information/description is optional."
    }, { status: 400 });
  }

  let post = null;
  let occurrence = null;
  if (requestedPostId) {
    const result = await context.admin.from("posts").select("*").eq("id", requestedPostId).single();
    if (result.error) return Response.json({ ok: false, error: result.error.message }, { status: 404 });
    post = result.data;
  }
  if (occurrenceId) {
    const result = await context.admin.from("automation_occurrences").select("*").eq("id", occurrenceId).single();
    if (result.error) return Response.json({ ok: false, error: result.error.message }, { status: 404 });
    occurrence = result.data;
  }
  const ruleId = post?.automation_rule_id || occurrence?.automation_rule_id;
  const { data: rule } = ruleId ? await context.admin.from("automation_rules").select("*").eq("id", ruleId).maybeSingle() : { data: null };
  const brandProfileId = post?.brand_profile_id || occurrence?.brand_profile_id || rule?.brand_profile_id;
  const { data: brandProfile } = brandProfileId ? await context.admin.from("brand_profiles").select("business_name, content_language, website_url").eq("id", brandProfileId).maybeSingle() : { data: null };
  const language = post?.language || rule?.language || "English";
  const campaign = occurrence?.campaign_title || rule?.name || "campaign";
  const enhancedRule = { ...(rule || {}), brand_profile: brandProfile || null, language, campaign_theme: campaign };
  let content = String(body?.content || "").trim();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  try {
    const response = await openai.responses.create({
      model: process.env.POST_TEXT_MODEL || "gpt-5.5",
      input: `Write one polished social-media carousel caption in ${language} for ${campaign}. The five admin-supplied product images, product names and product URLs are authoritative and may be a mix of old products and newly added products. Use only those five products. Product descriptions may be empty, so do not invent missing details, prices, offers, specifications or claims. Include a natural CTA and relevant hashtags.\n${JSON.stringify(products)}`,
      max_output_tokens: 1200,
    });
    content = String(response.output_text || content).trim();
  } catch (error) {
    if (!content) return Response.json({ ok: false, error: `Caption regeneration failed: ${error.message}` }, { status: 502 });
  }

  const now = new Date().toISOString();
  if (!post) {
    const insert = await context.admin.from("posts").insert({
      user_id: occurrence.user_id,
      brand_profile_id: occurrence.brand_profile_id,
      automation_rule_id: occurrence.automation_rule_id,
      content,
      platform: rule?.platform || "instagram",
      post_type: rule?.post_type || occurrence.content_type_label || "Carousel",
      content_format: "carousel",
      language,
      source: "automation_admin_repair",
      source_label: "Regenerated from admin-supplied verified materials",
      status: "pending_approval",
      approval_required: true,
      approval_token: crypto.randomBytes(32).toString("hex"),
      admin_review_status: "pending",
      admin_product_items: products,
      scheduled_for: occurrence.scheduled_for,
      image_status: "ready",
      created_at: now,
      updated_at: now,
    }).select("*").single();
    if (insert.error) return Response.json({ ok: false, error: insert.error.message }, { status: 500 });
    post = insert.data;
  } else {
    const update = await context.admin.from("posts").update({ content, content_format: "carousel", status: "pending_approval", admin_review_status: "pending", admin_product_items: products, image_status: "ready", updated_at: now }).eq("id", post.id);
    if (update.error) return Response.json({ ok: false, error: update.error.message }, { status: 500 });
  }

  const slides = [];
  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const presentation = getCarouselProductLabelPresentation(product, product.title);
    const rendered = await renderCarouselProductSlideImage({
      sourceImageUrl: product.image_url,
      supabase: context.admin,
      rule: enhancedRule,
      productTitle: presentation.title,
      productBrand: presentation.brand,
      productDescriptor: presentation.descriptor,
      includeLogo: false,
      languageHint: language,
    });
    const path = `admin-regenerated/${post.id}/${index + 1}-${crypto.randomUUID()}.png`;
    const upload = await context.admin.storage.from("post-images").upload(path, Buffer.from(rendered.imageBase64, "base64"), { contentType: "image/png", upsert: false });
    if (upload.error) return Response.json({ ok: false, error: upload.error.message }, { status: 500 });
    const { data: publicData } = context.admin.storage.from("post-images").getPublicUrl(path);
    slides.push({
      user_id: post.user_id,
      post_id: post.id,
      slide_order: index + 1,
      slide_type: "content",
      headline: product.title,
      body: product.description || null,
      cta_text: null,
      image_url: publicData.publicUrl,
      product_url: product.url || null,
      logo_enabled: false,
      metadata: {
        product_title: product.title,
        product_description: product.description || null,
        product_brand: product.product_brand || null,
        product_display_type: product.product_display_type || null,
        source_image_url: product.image_url,
        carousel_slide_role: "product",
        admin_regenerated: true,
        admin_materials_authoritative: true,
        product_label_applied: rendered.productLabelApplied,
        product_label_placement: rendered.productLabelPlacement,
        product_label_layout: rendered.productLabelLayout,
      },
    });
  }
  const requestedOutro = body?.outro_slide || null;
  if (body?.preserve_outro && requestedOutro?.image_url) {
    slides.push({
      user_id: post.user_id,
      post_id: post.id,
      slide_order: 6,
      slide_type: "content",
      headline: requestedOutro.headline || brandProfile?.business_name || campaign,
      body: requestedOutro.body || null,
      cta_text: requestedOutro.cta_text || null,
      image_url: requestedOutro.image_url,
      product_url: requestedOutro.product_url || brandProfile?.website_url || null,
      logo_enabled: false,
      metadata: { ...(requestedOutro.metadata || {}), carousel_slide_role: "product_outro", admin_preserved: true },
    });
  } else {
    const outroCopy = {
      headline: brandProfile?.business_name || campaign,
      body: content,
      cta_text: rule?.cta_type || "Explore more",
    };
    const generatedOutro = await generateCarouselOutroSlideImage(openai, enhancedRule, outroCopy, products);
    const outroPath = `admin-regenerated/${post.id}/6-${crypto.randomUUID()}.png`;
    const outroUpload = await context.admin.storage.from("post-images").upload(outroPath, Buffer.from(generatedOutro.imageBase64, "base64"), { contentType: "image/png", upsert: false });
    if (outroUpload.error) return Response.json({ ok: false, error: outroUpload.error.message }, { status: 500 });
    const { data: outroPublicData } = context.admin.storage.from("post-images").getPublicUrl(outroPath);
    slides.push({
      user_id: post.user_id,
      post_id: post.id,
      slide_order: 6,
      slide_type: "content",
      headline: outroCopy.headline,
      body: outroCopy.body,
      cta_text: outroCopy.cta_text,
      image_url: outroPublicData.publicUrl,
      product_url: brandProfile?.website_url || null,
      logo_enabled: false,
      metadata: { carousel_slide_role: "product_outro", admin_regenerated: true, image_prompt: generatedOutro.imagePrompt },
    });
  }
  const { data: previousSlides, error: previousSlidesError } = await context.admin
    .from("post_slides")
    .select("*")
    .eq("post_id", post.id)
    .order("slide_order", { ascending: true });
  if (previousSlidesError) return Response.json({ ok: false, error: previousSlidesError.message }, { status: 500 });

  const deleteSlides = await context.admin.from("post_slides").delete().eq("post_id", post.id);
  if (deleteSlides.error) return Response.json({ ok: false, error: deleteSlides.error.message }, { status: 500 });
  // post_slides.slide_type is a database-level structural type. Product/outro semantics
  // belong in metadata.carousel_slide_role, exactly like the normal carousel generator.
  // Keep every admin-regenerated carousel row on the supported `content` type so an
  // otherwise successful repair can never fail the post_slides_slide_type_check constraint.
  const invalidSlideType = slides.find((slide) => slide.slide_type !== "content");
  if (invalidSlideType) {
    if (previousSlides?.length) await context.admin.from("post_slides").insert(previousSlides);
    return Response.json({
      ok: false,
      error: `Regeneration safety check failed before save: unsupported slide type ${invalidSlideType.slide_type}.`,
    }, { status: 500 });
  }
  const insertSlides = await context.admin.from("post_slides").insert(slides);
  if (insertSlides.error) {
    if (previousSlides?.length) await context.admin.from("post_slides").insert(previousSlides);
    return Response.json({ ok: false, error: `Regeneration could not be saved: ${insertSlides.error.message}` }, { status: 500 });
  }
  const postReadyUpdate = await context.admin.from("posts").update({
    content,
    status: "pending_approval",
    admin_review_status: "pending",
    admin_product_items: products,
    slide_count: slides.length,
    slide_generation_status: "ready",
    slide_render_status: "ready",
    image_status: "ready",
    updated_at: now,
  }).eq("id", post.id);
  if (postReadyUpdate.error) return Response.json({ ok: false, error: postReadyUpdate.error.message }, { status: 500 });
  if (occurrenceId) await context.admin.from("automation_occurrences").update({ post_id: post.id, metadata: { ...(occurrence?.metadata || {}), admin_product_items: products, admin_regenerated_at: now } }).eq("id", occurrenceId);
  await context.admin.from("admin_review_cases").upsert({ occurrence_id: occurrenceId || null, post_id: post.id, user_id: post.user_id, brand_profile_id: post.brand_profile_id, automation_rule_id: post.automation_rule_id, status: "awaiting_spreelo", draft_content: content, product_items: products, needs_review: true, failure_code: null, failure_stage: null, failure_message: null, updated_at: now }, { onConflict: occurrenceId ? "occurrence_id" : "post_id" });
  return Response.json({ ok: true, post_id: post.id, slide_count: slides.length });
}
