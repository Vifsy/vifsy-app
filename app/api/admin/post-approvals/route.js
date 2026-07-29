import { adminContextError, getAdminContext } from "../../../../lib/adminAuth";
import {
  buildCustomerApprovalReleaseEmail,
  getAdminReviewSettings,
} from "../../../../lib/adminPostReview";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.spreelo.com";
const RESEND_FROM_EMAIL = "Spreelo <noreply@spreelo.com>";
const VISIBLE_STATUSES = new Set(["pending_approval", "approved", "rejected"]);
const REVIEW_STATUSES = new Set(["new", "reviewing", "resolved"]);
const REFUND_STATUSES = new Set(["pending_review", "approved", "declined", "credited"]);

function isMissingReviewSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("spreelo_admin_review_settings") ||
    message.includes("admin_post_reviews")
  );
}

function getHostname(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function normalizeProductUrls(values, websiteUrl) {
  const websiteHost = getHostname(websiteUrl);
  const unique = [];
  for (const value of Array.isArray(values) ? values : []) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      throw new Error(`Ogiltig produktlänk: ${raw}`);
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Produktlänken måste börja med http eller https: ${raw}`);
    }
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (
      websiteHost &&
      host !== websiteHost &&
      !host.endsWith(`.${websiteHost}`) &&
      !websiteHost.endsWith(`.${host}`)
    ) {
      throw new Error("Alla produktlänkar måste tillhöra kundens webbplats.");
    }
    parsed.hash = "";
    const normalized = parsed.toString();
    if (!unique.includes(normalized)) unique.push(normalized);
  }
  return unique.slice(0, 8);
}

async function sendCustomerReleaseEmail({ to, email }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!response.ok) {
    throw new Error((await response.text()) || "Customer approval email failed.");
  }
  return response.json().catch(() => ({}));
}

export async function GET(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const url = new URL(request.url);
  const status = String(url.searchParams.get("status") || "all");

  let query = context.admin
    .from("posts")
    .select(
      "id, user_id, brand_profile_id, automation_rule_id, status, content, platform, post_type, content_format, image_url, video_url, image_status, video_status, scheduled_for, created_at, updated_at, approved_at, approval_email_sent_at"
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
  const brandIds = Array.from(new Set(postRows.map((item) => item.brand_profile_id).filter(Boolean)));
  const userIds = Array.from(new Set(postRows.map((item) => item.user_id).filter(Boolean)));
  const postIds = postRows.map((item) => item.id);

  const { data: reviewRows, error: reviewError } = postIds.length
    ? await context.admin
        .from("admin_post_reviews")
        .select(
          "id, post_id, previous_post_id, root_post_id, automation_rule_id, revision, status, requested_product_urls, admin_note, admin_notified_at, customer_email_released_at, reviewed_at, created_at"
        )
        .in("post_id", postIds)
    : { data: [], error: null };
  if (reviewError && !isMissingReviewSchema(reviewError)) {
    return Response.json({ ok: false, error: reviewError.message }, { status: 500 });
  }

  const previousPostIds = Array.from(
    new Set((reviewRows || []).map((item) => item.previous_post_id).filter(Boolean))
  );
  const allSlidePostIds = Array.from(new Set([...postIds, ...previousPostIds]));

  const [
    { data: brands },
    { data: feedbackRows },
    { data: slideRows },
    { data: previousPosts },
  ] = await Promise.all([
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
    allSlidePostIds.length
      ? context.admin
          .from("post_slides")
          .select("post_id, slide_order, headline, body, cta_text, image_url, product_url, metadata")
          .in("post_id", allSlidePostIds)
          .order("slide_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    previousPostIds.length
      ? context.admin
          .from("posts")
          .select(
            "id, status, content, platform, post_type, content_format, image_url, video_url, scheduled_for, created_at"
          )
          .in("id", previousPostIds)
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
  const reviewMap = Object.fromEntries((reviewRows || []).map((item) => [item.post_id, item]));
  const slidesMap = (slideRows || []).reduce((map, slide) => {
    if (!map[slide.post_id]) map[slide.post_id] = [];
    map[slide.post_id].push(slide);
    return map;
  }, {});
  const previousPostMap = Object.fromEntries(
    (previousPosts || []).map((item) => [
      item.id,
      { ...item, slides: slidesMap[item.id] || [] },
    ])
  );
  const settings = await getAdminReviewSettings(context.admin);

  return Response.json({
    ok: true,
    settings,
    posts: postRows.map((item) => ({
      ...item,
      brand_name: brandMap[item.brand_profile_id] || "",
      customer_email: userMap[item.user_id] || "",
      rejection: feedbackMap[item.id] || null,
      admin_review: reviewMap[item.id] || null,
      previous_post: reviewMap[item.id]?.previous_post_id
        ? previousPostMap[reviewMap[item.id].previous_post_id] || null
        : null,
      slides: slidesMap[item.id] || [],
    })),
  });
}

export async function POST(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || "").trim();
  const now = new Date().toISOString();

  if (action === "update_settings") {
    const reviewRecipient = String(body?.review_recipient || "").trim();
    if (reviewRecipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reviewRecipient)) {
      return Response.json({ ok: false, error: "Ange en giltig e-postadress." }, { status: 400 });
    }
    const { data, error } = await context.admin
      .from("spreelo_admin_review_settings")
      .upsert(
        {
          id: "global",
          review_gate_enabled: Boolean(body?.review_gate_enabled),
          review_recipient: reviewRecipient || null,
          updated_by: context.user.id,
          updated_at: now,
        },
        { onConflict: "id" }
      )
      .select("*")
      .single();
    if (error) {
      return Response.json(
        {
          ok: false,
          error: isMissingReviewSchema(error)
            ? "Kör SQL-filen supabase/v144_admin_post_review_gate.sql först."
            : error.message,
        },
        { status: 500 }
      );
    }
    return Response.json({ ok: true, settings: data });
  }

  const postId = String(body?.post_id || "").trim();
  if (!postId || !["approve", "reject", "regenerate"].includes(action)) {
    return Response.json({ ok: false, error: "Ogiltig granskningsåtgärd." }, { status: 400 });
  }

  const { data: post, error: postError } = await context.admin
    .from("posts")
    .select(
      "id, user_id, brand_profile_id, automation_rule_id, status, content, platform, post_type, content_format, image_url, video_url, approval_token, scheduled_for"
    )
    .eq("id", postId)
    .single();
  if (postError || !post) {
    return Response.json({ ok: false, error: postError?.message || "Inlägget saknas." }, { status: 404 });
  }

  const [{ data: brand }, { data: slides }, { data: review }] = await Promise.all([
    context.admin
      .from("brand_profiles")
      .select("id, business_name, website_url, website_product_source_url")
      .eq("id", post.brand_profile_id)
      .maybeSingle(),
    context.admin
      .from("post_slides")
      .select("slide_order, headline, image_url, product_url")
      .eq("post_id", post.id)
      .order("slide_order", { ascending: true }),
    context.admin
      .from("admin_post_reviews")
      .select("*")
      .eq("post_id", post.id)
      .maybeSingle(),
  ]);

  if (!review) {
    return Response.json(
      { ok: false, error: "Inlägget ingår inte i admin-granskningsflödet." },
      { status: 409 }
    );
  }

  if (review.status === "superseded") {
    return Response.json(
      { ok: false, error: "En nyare version har redan beställts från detta inlägg." },
      { status: 409 }
    );
  }

  if (action === "approve") {
    if (!post.approval_token) {
      return Response.json({ ok: false, error: "Inläggets godkännandelänk saknas." }, { status: 409 });
    }
    const { data: userData, error: userError } =
      await context.admin.auth.admin.getUserById(post.user_id);
    const customerEmail = userData?.user?.email || "";
    if (userError || !customerEmail) {
      return Response.json({ ok: false, error: "Kundens e-postadress saknas." }, { status: 400 });
    }
    const approveUrl = `${APP_URL}/api/approve-post?token=${encodeURIComponent(post.approval_token)}`;
    const rejectUrl = `${APP_URL}/api/reject-post?token=${encodeURIComponent(post.approval_token)}`;
    const email = buildCustomerApprovalReleaseEmail({
      post,
      slides: slides || [],
      approveUrl,
      rejectUrl,
      brandName: brand?.business_name || "",
    });
    try {
      await sendCustomerReleaseEmail({ to: customerEmail, email });
    } catch (emailError) {
      return Response.json({ ok: false, error: emailError.message }, { status: 502 });
    }
    await Promise.all([
      context.admin
        .from("admin_post_reviews")
        .update({
          status: "approved",
          admin_note: String(body?.admin_note || "").trim() || null,
          reviewed_by: context.user.id,
          reviewed_at: now,
          customer_email_released_at: now,
          updated_at: now,
        })
        .eq("post_id", post.id),
      context.admin
        .from("posts")
        .update({ approval_email_sent_at: now, updated_at: now })
        .eq("id", post.id),
    ]);
    return Response.json({ ok: true, action, customer_email: customerEmail });
  }

  if (action === "reject") {
    await Promise.all([
      context.admin
        .from("admin_post_reviews")
        .update({
          status: "rejected",
          admin_note: String(body?.admin_note || "").trim() || null,
          reviewed_by: context.user.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq("post_id", post.id),
      context.admin
        .from("posts")
        .update({ status: "rejected", approval_token: null, updated_at: now })
        .eq("id", post.id),
    ]);
    return Response.json({ ok: true, action });
  }

  if (!post.automation_rule_id) {
    return Response.json({ ok: false, error: "Inlägget saknar en automation att köra om." }, { status: 409 });
  }
  const { data: rule, error: ruleError } = await context.admin
    .from("automation_rules")
    .select("*")
    .eq("id", post.automation_rule_id)
    .single();
  if (ruleError || !rule) {
    return Response.json({ ok: false, error: ruleError?.message || "Automationen saknas." }, { status: 404 });
  }

  let productUrls;
  try {
    productUrls = normalizeProductUrls(
      body?.product_urls,
      brand?.website_product_source_url || brand?.website_url || rule.website_url || ""
    );
  } catch (urlError) {
    return Response.json({ ok: false, error: urlError.message }, { status: 400 });
  }
  const rerunAt = new Date(Date.now() + 5_000).toISOString();
  const originalNextRunAt =
    rule.admin_review_original_next_run_at ||
    (rule.schedule_type === "weekly" ? rule.next_run_at : null);
  const rootPostId = review.root_post_id || post.id;

  const { error: rerunError } = await context.admin
    .from("automation_rules")
    .update({
      is_active: true,
      next_run_at: rerunAt,
      last_run_at: null,
      last_error: null,
      queue_locked_until: null,
      retry_not_before: null,
      queue_attempts: 0,
      queue_priority: Math.max(100, Number(rule.queue_priority || 0)),
      generation_occurrence_status: null,
      generation_occurrence_scheduled_for: null,
      generation_started_at: null,
      generation_finished_at: null,
      generation_failure_code: null,
      generation_failure_message: null,
      generation_customer_message: null,
      generation_failure_stage: null,
      admin_review_rerun_of_post_id: post.id,
      admin_review_root_post_id: rootPostId,
      admin_review_original_next_run_at: originalNextRunAt,
      admin_product_override_urls: productUrls,
      admin_review_no_charge: true,
      updated_at: now,
    })
    .eq("id", rule.id);
  if (rerunError) {
    return Response.json({ ok: false, error: rerunError.message }, { status: 500 });
  }

  await Promise.all([
    context.admin
      .from("admin_post_reviews")
      .update({
        status: "superseded",
        requested_product_urls: productUrls,
        admin_note: String(body?.admin_note || "").trim() || null,
        reviewed_by: context.user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("post_id", post.id),
    context.admin
      .from("posts")
      .update({ status: "rejected", approval_token: null, updated_at: now })
      .eq("id", post.id),
  ]);

  return Response.json({
    ok: true,
    action,
    queued_at: rerunAt,
    product_urls: productUrls,
  });
}

export async function PATCH(request) {
  const context = await getAdminContext(request);
  if (context.error) return adminContextError(context);

  const body = await request.json().catch(() => ({}));
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
