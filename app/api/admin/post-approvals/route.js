import { adminContextError, getAdminContext } from "../../../../lib/adminAuth";

export const dynamic = "force-dynamic";

const VISIBLE_STATUSES = new Set(["pending_approval", "approved", "rejected", "failed"]);
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
      "id, user_id, brand_profile_id, automation_rule_id, status, content, platform, post_type, content_format, image_url, video_url, image_status, video_status, video_error, scheduled_for, created_at, updated_at, approved_at, approval_token, approval_email_sent_at, admin_review_status, admin_reviewed_at, admin_review_note"
    )
    .in("status", Array.from(VISIBLE_STATUSES))
    .order("created_at", { ascending: false })
    .limit(150);

  if (VISIBLE_STATUSES.has(status)) query = query.eq("status", status);

  const { data: posts, error } = await query;
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const postRows = posts || [];
  const { data: failedOccurrences } = ["all", "failed"].includes(status)
    ? await context.admin
        .from("automation_occurrences")
        .select("id, post_id, user_id, brand_profile_id, automation_rule_id, scheduled_for, content_type_label, content_format, campaign_title, started_at, finished_at, failure_code, failure_stage, failure_message_internal, failure_message_customer, refunded_credits, metadata")
        .eq("status", "failed_terminal")
        .order("started_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const orphanFailures = (failedOccurrences || []).filter(
    (occurrence) => !occurrence.post_id || !postRows.some((post) => post.id === occurrence.post_id)
  );
  const brandIds = Array.from(new Set([...postRows, ...orphanFailures].map((item) => item.brand_profile_id).filter(Boolean)));
  const userIds = Array.from(new Set([...postRows, ...orphanFailures].map((item) => item.user_id).filter(Boolean)));
  const postIds = postRows.map((item) => item.id);

  const [{ data: brands }, { data: feedbackRows }, { data: slideRows }] = await Promise.all([
    brandIds.length
      ? context.admin.from("brand_profiles").select("id, business_name").in("id", brandIds)
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

  return Response.json({
    ok: true,
    posts: [...postRows.map((item) => ({
      ...item,
      brand_name: brandMap[item.brand_profile_id] || "",
      customer_email: userMap[item.user_id] || "",
      rejection: feedbackMap[item.id] || null,
      slides: slidesMap[item.id] || [],
    })), ...orphanFailures.map((occurrence) => ({
      id: `failure-${occurrence.id}`,
      occurrence_id: occurrence.id,
      user_id: occurrence.user_id,
      brand_profile_id: occurrence.brand_profile_id,
      automation_rule_id: occurrence.automation_rule_id,
      status: "failed",
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
      admin_review_status: "failure",
      brand_name: brandMap[occurrence.brand_profile_id] || "",
      customer_email: userMap[occurrence.user_id] || "",
      rejection: null,
      slides: [],
      failure: occurrence,
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
    .select("id, user_id, brand_profile_id, status, content, platform, post_type, content_format, image_url, video_url, approval_token, scheduled_for, admin_review_status")
    .eq("id", postId)
    .single();
  if (postError || !post) {
    return Response.json({ ok: false, error: postError?.message || "Post not found." }, { status: 404 });
  }
  if (post.status === "failed") {
    return Response.json({ ok: false, error: "A failed post must be repaired before it can be released." }, { status: 400 });
  }

  const [{ data: brand }, { data: slides }] = await Promise.all([
    context.admin.from("brand_profiles").select("business_name").eq("id", post.brand_profile_id).maybeSingle(),
    context.admin.from("post_slides").select("slide_order, image_url, headline").eq("post_id", post.id).order("slide_order"),
  ]);
  let customerEmail = "";
  try {
    const { data } = await context.admin.auth.admin.getUserById(post.user_id);
    customerEmail = data?.user?.email || "";
  } catch {
    customerEmail = "";
  }
  if (!customerEmail) return Response.json({ ok: false, error: "Customer email is missing." }, { status: 400 });
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return Response.json({ ok: false, error: "RESEND_API_KEY is not configured." }, { status: 500 });

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
  return Response.json({ ok: true, released: true, recipient: customerEmail });
}
