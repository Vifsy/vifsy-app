import { adminContextError, getAdminContext } from "../../../../lib/adminAuth";
import { sendApprovalEmail } from "../../cron/run-automations/route.js";

export const dynamic = "force-dynamic";

const VISIBLE_STATUSES = new Set(["pending_approval", "approved", "rejected", "failed", "creating"]);
const REVIEW_STATUSES = new Set(["new", "reviewing", "resolved"]);
const REFUND_STATUSES = new Set(["pending_review", "approved", "declined", "credited"]);

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") || "all");

  let query = context.admin
    .from("posts")
    .select(
      "id, user_id, brand_profile_id, automation_rule_id, status, content, platform, post_type, content_format, image_url, video_url, image_status, video_status, video_error, scheduled_for, created_at, updated_at, approved_at, approval_token, approval_email_sent_at, admin_review_status, admin_reviewed_at, admin_review_note, admin_product_items, admin_archived_at"
    )
    .in("status", Array.from(VISIBLE_STATUSES))
    .is("admin_archived_at", null)
    .order("created_at", { ascending: false })
    .limit(150);

  if (VISIBLE_STATUSES.has(status)) query = query.eq("status", status);

  const { data: posts, error } = await query;
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const postRows = posts || [];
  const occurrenceResult = ["all", "failed", "creating"].includes(status)
    ? await context.admin
        .from("automation_occurrences")
        .select("id, post_id, user_id, brand_profile_id, automation_rule_id, status, scheduled_for, content_type_label, content_format, campaign_title, started_at, finished_at, failure_code, failure_stage, failure_message_internal, failure_message_customer, refunded_credits, metadata")
        .order("started_at", { ascending: false })
        .limit(200)
    : { data: [], error: null };
  if (occurrenceResult.error) {
    return Response.json({ ok: false, error: occurrenceResult.error.message }, { status: 500 });
  }

  const reviewCaseResult = ["all", "failed"].includes(status)
    ? await context.admin
        .from("admin_review_cases")
        .select("id, occurrence_id, post_id, user_id, brand_profile_id, automation_rule_id, status, scheduled_for, campaign_title, content_type_label, content_format, product_items, failure_code, failure_stage, failure_message, needs_review, created_at, updated_at")
        .eq("needs_review", true)
        .eq("status", "needs_repair")
        .order("updated_at", { ascending: false })
        .limit(200)
    : { data: [], error: null };
  if (
    reviewCaseResult.error &&
    !/admin_review_cases|schema cache|does not exist/i.test(
      String(reviewCaseResult.error.message || "")
    )
  ) {
    return Response.json({ ok: false, error: reviewCaseResult.error.message }, { status: 500 });
  }

  const occurrenceRows = (occurrenceResult.data || []).filter((occurrence) => {
    if (status === "failed") return occurrence.status === "failed_terminal";
    if (status === "creating") return !["completed", "failed_terminal"].includes(occurrence.status);
    return true;
  });
  const reviewCaseRows = reviewCaseResult.data || [];
  const reviewCaseByOccurrence = new Map(
    reviewCaseRows
      .filter((item) => item.occurrence_id)
      .map((item) => [item.occurrence_id, item])
  );

  const orphanFailures = occurrenceRows.filter(
    (occurrence) => !occurrence.post_id || !postRows.some((post) => post.id === occurrence.post_id)
  );
  const orphanOccurrenceIds = new Set(
    orphanFailures.map((item) => item.id).filter(Boolean)
  );
  const reviewOnlyFailures = reviewCaseRows.filter(
    (reviewCase) =>
      (!reviewCase.post_id || !postRows.some((post) => post.id === reviewCase.post_id)) &&
      (!reviewCase.occurrence_id || !orphanOccurrenceIds.has(reviewCase.occurrence_id))
  );

  const adminQueueRows = [...postRows, ...orphanFailures, ...reviewOnlyFailures];
  const brandIds = Array.from(new Set(adminQueueRows.map((item) => item.brand_profile_id).filter(Boolean)));
  const userIds = Array.from(new Set(adminQueueRows.map((item) => item.user_id).filter(Boolean)));
  const postIds = postRows.map((item) => item.id);

  const [{ data: brands }, { data: feedbackRows }, { data: slideRows }] = await Promise.all([
    brandIds.length
      ? context.admin.from("brand_profiles").select("id, business_name, admin_review_required").in("id", brandIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? context.admin
          .from("post_rejection_feedback")
          .select(
            "id, post_id, reason_category, reason_text, contact_email, review_status, refund_status, admin_note, reviewed_at, created_at"
          )
          .in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? context.admin
          .from("post_slides")
          .select("post_id, slide_order, headline, body, cta_text, image_url, product_url, metadata")
          .in("post_id", postIds)
          .order("slide_order", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const userEntries = await Promise.all(
    userIds.map(async (userId) => {
      try {
        const { data } = await context.admin.auth.admin.getUserById(userId);
        return [userId, data?.user?.email || ""];
      } catch {
        return [userId, ""];
      }
    })
  );

  const brandMap = Object.fromEntries((brands || []).map((item) => [item.id, item.business_name]));
  const userMap = Object.fromEntries(userEntries);
  const feedbackMap = Object.fromEntries((feedbackRows || []).map((item) => [item.post_id, item]));
  const slidesMap = (slideRows || []).reduce((map, slide) => {
    if (!map[slide.post_id]) map[slide.post_id] = [];
    map[slide.post_id].push(slide);
    return map;
  }, {});

  const getEditableProductItems = (post) => {
    const slideProducts = (slidesMap[post.id] || [])
      .filter((slide) => {
        const role = String(slide?.metadata?.carousel_slide_role || "").toLowerCase();
        const title = slide?.metadata?.product_title || slide?.headline;
        return Boolean(title || slide?.product_url) && !role.includes("outro") && !role.includes("cta");
      })
      .slice(0, 5)
      .map((slide) => ({
        title: String(slide?.metadata?.product_title || slide?.headline || "").trim(),
        description: String(
          slide?.metadata?.product_description ||
          slide?.body ||
          slide?.metadata?.product_title ||
          slide?.headline ||
          ""
        ).trim(),
        url: String(slide?.product_url || "").trim(),
        image_url: String(slide?.metadata?.source_image_url || slide?.image_url || "").trim(),
        preview_image_url: String(slide?.image_url || "").trim(),
        existing_slide_order: slide?.slide_order || null,
      }));
    const storedProducts = Array.isArray(post.admin_product_items)
      ? post.admin_product_items.slice(0, 5)
      : [];
    if (storedProducts.length === 0) return slideProducts;

    const itemCount = Math.max(slideProducts.length, storedProducts.length);
    return Array.from({ length: itemCount }, (_, index) => {
      const original = slideProducts[index] || {};
      const replacement = storedProducts[index] || {};
      const preferReplacement = (key) => {
        const replacementValue = String(replacement?.[key] || "").trim();
        return replacementValue || String(original?.[key] || "").trim();
      };

      return {
        ...original,
        ...replacement,
        image_url: preferReplacement("image_url"),
        title: preferReplacement("title"),
        description: preferReplacement("description"),
        url: preferReplacement("url"),
      };
    });
  };

  const getOutroSlide = (postId) => (slidesMap[postId] || []).find((slide) => {
    const role = String(slide?.metadata?.carousel_slide_role || "").toLowerCase();
    return role.includes("outro") || role.includes("cta") || String(slide?.metadata?.slide_type || "").toLowerCase() === "product_outro";
  }) || null;

  return Response.json({
    ok: true,
    posts: [...postRows.map((item) => ({
      ...item,
      admin_product_items: getEditableProductItems(item),
      brand_name: brandMap[item.brand_profile_id] || "",
      brand_admin_review_required: brands?.find((brand) => brand.id === item.brand_profile_id)?.admin_review_required ?? null,
      customer_email: userMap[item.user_id] || "",
      rejection: feedbackMap[item.id] || null,
      slides: slidesMap[item.id] || [],
      outro_slide: getOutroSlide(item.id),
    })), ...orphanFailures.map((occurrence) => ({
      id: `occurrence-${occurrence.id}`,
      occurrence_id: occurrence.id,
      user_id: occurrence.user_id,
      brand_profile_id: occurrence.brand_profile_id,
      automation_rule_id: occurrence.automation_rule_id,
      status: occurrence.status === "failed_terminal" ? "failed" : "creating",
      content: occurrence.campaign_title || occurrence.content_type_label || "",
      platform: null,
      post_type: occurrence.content_type_label || "Generation",
      content_format: occurrence.content_format || null,
      image_url: null,
      video_url: null,
      image_status: "missing",
      video_status: "missing",
      video_error: occurrence.failure_message_internal || occurrence.failure_message_customer || occurrence.failure_code,
      scheduled_for: occurrence.scheduled_for,
      created_at: occurrence.started_at,
      updated_at: occurrence.finished_at || occurrence.started_at,
      admin_review_status: occurrence.status === "failed_terminal" ? "needs_repair" : "creating",
      admin_product_items:
        reviewCaseByOccurrence.get(occurrence.id)?.product_items ||
        occurrence.metadata?.admin_product_items ||
        occurrence.metadata?.partial_products ||
        [],
      brand_admin_review_required: brands?.find((brand) => brand.id === occurrence.brand_profile_id)?.admin_review_required ?? null,
      brand_name: brandMap[occurrence.brand_profile_id] || "",
      customer_email: userMap[occurrence.user_id] || "",
      rejection: null,
      slides: [],
      failure: {
        ...occurrence,
        ...(reviewCaseByOccurrence.get(occurrence.id)
          ? {
              review_case_id: reviewCaseByOccurrence.get(occurrence.id).id,
              failure_code:
                reviewCaseByOccurrence.get(occurrence.id).failure_code ||
                occurrence.failure_code,
              failure_stage:
                reviewCaseByOccurrence.get(occurrence.id).failure_stage ||
                occurrence.failure_stage,
              failure_message_internal:
                reviewCaseByOccurrence.get(occurrence.id).failure_message ||
                occurrence.failure_message_internal,
            }
          : {}),
      },
    })), ...reviewOnlyFailures.map((reviewCase) => ({
      id: `review-case-${reviewCase.id}`,
      occurrence_id: reviewCase.occurrence_id || null,
      user_id: reviewCase.user_id,
      brand_profile_id: reviewCase.brand_profile_id,
      automation_rule_id: reviewCase.automation_rule_id,
      status: "failed",
      content: reviewCase.campaign_title || reviewCase.content_type_label || "",
      platform: null,
      post_type: reviewCase.content_type_label || "Generation",
      content_format: reviewCase.content_format || null,
      image_url: null,
      video_url: null,
      image_status: "missing",
      video_status: "missing",
      video_error: reviewCase.failure_message || reviewCase.failure_code || "Post generation needs repair",
      scheduled_for: reviewCase.scheduled_for,
      created_at: reviewCase.created_at,
      updated_at: reviewCase.updated_at || reviewCase.created_at,
      admin_review_status: "needs_repair",
      admin_product_items: Array.isArray(reviewCase.product_items) ? reviewCase.product_items : [],
      brand_admin_review_required: brands?.find((brand) => brand.id === reviewCase.brand_profile_id)?.admin_review_required ?? null,
      brand_name: brandMap[reviewCase.brand_profile_id] || "",
      customer_email: userMap[reviewCase.user_id] || "",
      rejection: null,
      slides: [],
      failure: {
        id: reviewCase.occurrence_id || reviewCase.id,
        review_case_id: reviewCase.id,
        status: "failed_terminal",
        scheduled_for: reviewCase.scheduled_for,
        content_type_label: reviewCase.content_type_label,
        content_format: reviewCase.content_format,
        campaign_title: reviewCase.campaign_title,
        failure_code: reviewCase.failure_code,
        failure_stage: reviewCase.failure_stage,
        failure_message_internal: reviewCase.failure_message,
      },
    }))],
  });
}

export async function PATCH(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const body = await request.json().catch(() => ({}));
  if (body?.action === "release_to_customer") {
    return releasePostToCustomer({ context, body });
  }
  if (body?.action === "set_brand_review_policy") {
    return setBrandReviewPolicy({ context, body });
  }
  if (body?.action === "save_materials") {
    return saveAdminMaterials({ context, body });
  }
  if (body?.action === "archive" || body?.action === "bulk_archive") {
    return archivePosts({ context, body });
  }
  const feedbackId = String(body?.feedback_id || "").trim();
  if (!feedbackId) {
    return Response.json({ ok: false, error: "Feedback ID is required." }, { status: 400 });
  }

  const reviewStatus = REVIEW_STATUSES.has(String(body?.review_status || ""))
    ? String(body.review_status)
    : "new";
  const requestedRefundStatus = REFUND_STATUSES.has(String(body?.refund_status || ""))
    ? String(body.refund_status)
    : "pending_review";
  const now = new Date().toISOString();

  const { data: existingFeedback, error: feedbackError } = await context.admin
    .from("post_rejection_feedback")
    .select("id, post_id, user_id, refund_status")
    .eq("id", feedbackId)
    .single();

  if (feedbackError || !existingFeedback) {
    return Response.json(
      { ok: false, error: feedbackError?.message || "Feedback could not be found." },
      { status: 404 }
    );
  }

  let finalRefundStatus = requestedRefundStatus;
  const shouldReturnCredits =
    ["approved", "credited"].includes(requestedRefundStatus) &&
    existingFeedback.refund_status !== "credited";

  if (shouldReturnCredits) {
    const { data: post, error: postError } = await context.admin
      .from("posts")
      .select("id, user_id, automation_rule_id")
      .eq("id", existingFeedback.post_id)
      .single();

    if (postError || !post?.user_id) {
      return Response.json(
        { ok: false, error: postError?.message || "The rejected post account could not be found." },
        { status: 400 }
      );
    }

    let refundCredits = 1;
    if (post.automation_rule_id) {
      const { data: rule } = await context.admin
        .from("automation_rules")
        .select("credit_cost")
        .eq("id", post.automation_rule_id)
        .maybeSingle();
      refundCredits = Math.max(1, Number(rule?.credit_cost || 1));
    }

    let targetEmail = "";
    try {
      const { data } = await context.admin.auth.admin.getUserById(post.user_id);
      targetEmail = data?.user?.email || "";
    } catch {
      targetEmail = "";
    }

    const { error: adjustmentError } = await context.admin.rpc(
      "admin_adjust_user_credits",
      {
        p_target_user_id: post.user_id,
        p_target_email: targetEmail || null,
        p_amount: refundCredits,
        p_reason: `Approved rejection refund for post ${post.id}`,
        p_admin_user_id: context.user.id,
        p_admin_email: context.user.email || null,
      }
    );

    if (adjustmentError) {
      return Response.json({ ok: false, error: adjustmentError.message }, { status: 500 });
    }

    finalRefundStatus = "credited";
  } else if (
    existingFeedback.refund_status === "credited" &&
    requestedRefundStatus !== "credited"
  ) {
    finalRefundStatus = "credited";
  }

  const { data, error } = await context.admin
    .from("post_rejection_feedback")
    .update({
      review_status: reviewStatus,
      refund_status: finalRefundStatus,
      admin_note: String(body?.admin_note || "").trim() || null,
      reviewed_by: context.user.id,
      reviewed_at: reviewStatus === "new" ? null : now,
      updated_at: now,
    })
    .eq("id", feedbackId)
    .select("*")
    .single();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, feedback: data });
}

async function setBrandReviewPolicy({ context, body }) {
  const brandProfileId = String(body?.brand_profile_id || "").trim();
  if (!brandProfileId) return Response.json({ ok: false, error: "Brand profile ID is required." }, { status: 400 });
  const value = body?.admin_review_required === null ? null : Boolean(body?.admin_review_required);
  const { data, error } = await context.admin
    .from("brand_profiles")
    .update({ admin_review_required: value, updated_at: new Date().toISOString() })
    .eq("id", brandProfileId)
    .select("id, admin_review_required")
    .single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, brand: data });
}

function normalizeProductItems(items) {
  return (Array.isArray(items) ? items : []).slice(0, 10).map((item) => ({
    title: String(item?.title || "").trim().slice(0, 240),
    description: String(item?.description || "").trim().slice(0, 3000),
    url: String(item?.url || "").trim().slice(0, 2000),
    image_url: String(item?.image_url || "").trim().slice(0, 3000),
  }));
}

async function saveAdminMaterials({ context, body }) {
  const postId = String(body?.post_id || "").trim();
  const occurrenceId = String(body?.occurrence_id || "").trim();
  const productItems = normalizeProductItems(body?.product_items);
  const content = String(body?.content || "").trim().slice(0, 12000);
  if (!postId && !occurrenceId) return Response.json({ ok: false, error: "Post or occurrence ID is required." }, { status: 400 });

  if (postId) {
    const { error } = await context.admin.from("posts").update({
      admin_product_items: productItems,
      ...(content ? { content } : {}),
      admin_review_status: "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", postId);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (occurrenceId) {
    const { data: occurrence, error: loadError } = await context.admin
      .from("automation_occurrences").select("metadata").eq("id", occurrenceId).single();
    if (loadError) return Response.json({ ok: false, error: loadError.message }, { status: 500 });
    const { error } = await context.admin.from("automation_occurrences").update({
      metadata: { ...(occurrence?.metadata || {}), admin_product_items: productItems, admin_content: content || null },
    }).eq("id", occurrenceId);
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, product_items: productItems });
}

async function archivePosts({ context, body }) {
  const ids = Array.from(new Set((body?.post_ids || [body?.post_id]).map((value) => String(value || "").trim()).filter(Boolean)));
  if (!ids.length) return Response.json({ ok: false, error: "At least one post ID is required." }, { status: 400 });
  const now = new Date().toISOString();
  const { error } = await context.admin.from("posts").update({
    admin_archived_at: now,
    admin_archived_by: context.user.id,
    admin_review_status: "archived",
    updated_at: now,
  }).in("id", ids);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, archived: ids.length });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function releasePostToCustomer({ context, body }) {
  const postId = String(body?.post_id || "").trim();
  if (!postId) return Response.json({ ok: false, error: "Post ID is required." }, { status: 400 });

  const { data: post, error: postError } = await context.admin
    .from("posts")
    .select("id, user_id, brand_profile_id, automation_rule_id, status, content, platform, post_type, content_format, image_url, video_url, approval_token, scheduled_for, admin_review_status, language")
    .eq("id", postId)
    .single();
  if (postError || !post) {
    return Response.json({ ok: false, error: postError?.message || "Post not found." }, { status: 404 });
  }
  if (post.status === "failed") {
    return Response.json({ ok: false, error: "A failed post must be repaired before it can be released." }, { status: 400 });
  }

  const [{ data: brand }, { data: rule }] = await Promise.all([
    context.admin.from("brand_profiles").select("business_name, content_language").eq("id", post.brand_profile_id).maybeSingle(),
    post.automation_rule_id
      ? context.admin.from("automation_rules").select("*").eq("id", post.automation_rule_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  let customerEmail = "";
  let userAppLanguage = null;
  try {
    const { data } = await context.admin.auth.admin.getUserById(post.user_id);
    customerEmail = data?.user?.email || "";
    const metadata = data?.user?.user_metadata || {};
    userAppLanguage = metadata.app_language || metadata.appLanguage || metadata.ui_language || metadata.locale || null;
  } catch {
    customerEmail = "";
  }
  if (!customerEmail) return Response.json({ ok: false, error: "Customer email is missing." }, { status: 400 });
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return Response.json({ ok: false, error: "RESEND_API_KEY is not configured." }, { status: 500 });

  try {
    await sendApprovalEmail({
      supabase: context.admin,
      resendApiKey,
      to: customerEmail,
      rule: {
        ...(rule || {}),
        platform: post.platform || rule?.platform,
        post_type: post.post_type || rule?.post_type,
        content_format: post.content_format || rule?.content_format,
        language: post.language || rule?.language || brand?.content_language,
        brand_profile: brand || null,
      },
      postContent: post.content,
      approvalToken: post.approval_token,
      imageUrl: post.content_format === "carousel" ? null : post.image_url,
      userAppLanguage,
      postId: post.id,
      contentFormat: post.content_format,
    });
  } catch (emailError) {
    return Response.json({ ok: false, error: emailError?.message || "Customer email could not be sent." }, { status: 502 });
  }

  const releasedAt = new Date().toISOString();
  const { error: releaseUpdateError } = await context.admin.from("posts").update({
    admin_review_status: "approved_by_spreelo",
    admin_reviewed_at: releasedAt,
    admin_reviewed_by: context.user.id,
    admin_review_note: String(body?.admin_note || "").trim() || null,
    approval_email_sent_at: releasedAt,
    updated_at: releasedAt,
  }).eq("id", post.id);
  if (releaseUpdateError) return Response.json({ ok: false, error: releaseUpdateError.message }, { status: 500 });
  await context.admin.from("admin_review_cases").update({
    status: "approved_by_spreelo",
    needs_review: false,
    reviewed_at: releasedAt,
    reviewed_by: context.user.id,
    delivered_at: releasedAt,
    updated_at: releasedAt,
  }).eq("post_id", post.id);
  return Response.json({ ok: true, released: true, recipient: customerEmail });

  /* Legacy v143.28 release template retained below only for deployment rollback reference.
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.spreelo.com").replace(/\/$/, "");
  const token = encodeURIComponent(post.approval_token || "");
  const approveUrl = `${appUrl}/api/approve-post?token=${token}`;
  const rejectUrl = `${appUrl}/api/reject-post?token=${token}`;
  const media = (slides || []).length
    ? (slides || []).map((slide) => slide.image_url ? `<img src="${escapeHtml(slide.image_url)}" alt="" style="width:150px;height:150px;object-fit:contain;border:1px solid #e5e7eb;border-radius:10px;margin:5px"/>` : "").join("")
    : post.image_url
      ? `<img src="${escapeHtml(post.image_url)}" alt="" style="width:100%;max-height:460px;object-fit:contain;border-radius:14px"/>`
      : "";
  const brandName = brand?.business_name || "your brand";
  const html = `<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;padding:30px;color:#172033"><div style="color:#d65337;font-weight:800;letter-spacing:.1em;font-size:12px">SPREELO · READY FOR REVIEW</div><h1 style="font-size:28px;margin:10px 0">Your post for ${escapeHtml(brandName)} is ready</h1><p style="color:#667085;line-height:1.65">Spreelo has completed its internal quality review. Review the complete post below and approve it when you are happy.</p><div style="margin:22px 0">${media}</div><div style="white-space:pre-wrap;line-height:1.65;background:#f8fafc;padding:18px;border-radius:12px">${escapeHtml(post.content)}</div><div style="margin-top:24px"><a href="${approveUrl}" style="display:inline-block;background:#e85c3c;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:800;margin-right:9px">Approve post</a><a href="${rejectUrl}" style="display:inline-block;color:#344054;text-decoration:none;padding:12px 18px;border:1px solid #d6dce5;border-radius:10px;font-weight:700">Request changes</a></div></div>`;

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Spreelo <noreply@spreelo.com>",
      to: customerEmail,
      subject: `Your Spreelo post is ready · ${brandName}`,
      html,
      text: `Your post for ${brandName} is ready for review.\n\n${post.content || ""}\n\nApprove: ${approveUrl}\nRequest changes: ${rejectUrl}`,
    }),
  });
  if (!emailResponse.ok) {
    return Response.json({ ok: false, error: (await emailResponse.text()) || "Customer email could not be sent." }, { status: 502 });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await context.admin.from("posts").update({
    admin_review_status: "released",
    admin_reviewed_at: now,
    admin_reviewed_by: context.user.id,
    admin_review_note: String(body?.admin_note || "").trim() || null,
    approval_email_sent_at: now,
    updated_at: now,
  }).eq("id", post.id);
  if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
  return Response.json({ ok: true, released: true, recipient: customerEmail }); */
}
