import crypto from "crypto";
import OpenAI from "openai";
import { adminContextError, getAdminContext } from "../../../../../lib/adminAuth";
import { renderCarouselProductSlideImage } from "../../../cron/run-automations/route.js";

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
    .map((item) => ({ title: String(item?.title || "").trim(), description: String(item?.description || "").trim(), url: String(item?.url || "").trim(), image_url: String(item?.image_url || "").trim() }))
    .filter((item) => item.title && item.image_url)
    .slice(0, 5);
  if (!products.length) return Response.json({ ok: false, error: "Add at least one product name and image before regenerating." }, { status: 400 });

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
  const language = post?.language || rule?.language || "English";
  const campaign = occurrence?.campaign_title || rule?.name || "campaign";
  let content = String(body?.content || "").trim();
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: process.env.POST_TEXT_MODEL || "gpt-5.5",
      input: `Write one polished social-media carousel caption in ${language} for ${campaign}. Use only these supplied, verified products and facts. Do not invent prices, offers or claims. Include a natural CTA and relevant hashtags.\n${JSON.stringify(products)}`,
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
    const rendered = await renderCarouselProductSlideImage({ sourceImageUrl: product.image_url, supabase: context.admin, rule: { ...(rule || {}), campaign_theme: campaign }, productTitle: product.title, includeLogo: false, languageHint: language });
    const path = `admin-regenerated/${post.id}/${index + 1}-${crypto.randomUUID()}.png`;
    const upload = await context.admin.storage.from("post-images").upload(path, Buffer.from(rendered.imageBase64, "base64"), { contentType: "image/png", upsert: false });
    if (upload.error) return Response.json({ ok: false, error: upload.error.message }, { status: 500 });
    const { data: publicData } = context.admin.storage.from("post-images").getPublicUrl(path);
    slides.push({ post_id: post.id, slide_order: index + 1, headline: product.title, body: product.description || null, image_url: publicData.publicUrl, product_url: product.url || null, metadata: { product_title: product.title, admin_regenerated: true, product_label_applied: rendered.productLabelApplied, product_label_placement: rendered.productLabelPlacement, product_label_layout: rendered.productLabelLayout } });
  }
  await context.admin.from("post_slides").delete().eq("post_id", post.id);
  const insertSlides = await context.admin.from("post_slides").insert(slides);
  if (insertSlides.error) return Response.json({ ok: false, error: insertSlides.error.message }, { status: 500 });
  if (occurrenceId) await context.admin.from("automation_occurrences").update({ post_id: post.id, metadata: { ...(occurrence?.metadata || {}), admin_product_items: products, admin_regenerated_at: now } }).eq("id", occurrenceId);
  await context.admin.from("admin_review_cases").upsert({ occurrence_id: occurrenceId || null, post_id: post.id, user_id: post.user_id, brand_profile_id: post.brand_profile_id, automation_rule_id: post.automation_rule_id, status: "awaiting_spreelo", draft_content: content, product_items: products, needs_review: true, failure_code: null, failure_stage: null, failure_message: null, updated_at: now }, { onConflict: occurrenceId ? "occurrence_id" : "post_id" });
  return Response.json({ ok: true, post_id: post.id, slide_count: slides.length });
}
