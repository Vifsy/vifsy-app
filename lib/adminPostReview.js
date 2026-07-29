const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.spreelo.com";
const RESEND_FROM_EMAIL = "Spreelo <noreply@spreelo.com>";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatContent(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function isMissingReviewSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "42703" ||
    message.includes("spreelo_admin_review_settings") ||
    message.includes("admin_post_reviews")
  );
}

export async function getAdminReviewSettings(supabase) {
  const { data, error } = await supabase
    .from("spreelo_admin_review_settings")
    .select("id, review_gate_enabled, review_recipient, updated_at")
    .eq("id", "global")
    .maybeSingle();

  if (error) {
    if (!isMissingReviewSchema(error)) {
      console.warn("Could not load Spreelo admin review settings", {
        message: error.message,
      });
    }
    return {
      available: false,
      enabled: false,
      reviewRecipient: "",
    };
  }

  return {
    available: true,
    enabled: Boolean(data?.review_gate_enabled),
    reviewRecipient: String(data?.review_recipient || "").trim(),
    updatedAt: data?.updated_at || null,
  };
}

async function sendAdminReviewNotification({
  resendApiKey,
  to,
  postId,
  brandName,
  postContent,
  imageUrl,
  videoUrl,
  slides = [],
}) {
  if (!resendApiKey || !to) return { sent: false };

  const previewUrl = `${APP_URL}/admin/post-approvals?post=${encodeURIComponent(postId)}`;
  const slideHtml = (slides || [])
    .filter((slide) => slide?.image_url)
    .slice(0, 6)
    .map(
      (slide) =>
        `<img src="${escapeHtml(slide.image_url)}" alt="" style="width:31%;min-width:130px;border-radius:10px;border:1px solid #e5e7eb;">`
    )
    .join("");
  const mediaHtml = videoUrl
    ? `<p><a href="${escapeHtml(videoUrl)}">Öppna videofilen</a></p>`
    : imageUrl
      ? `<img src="${escapeHtml(imageUrl)}" alt="" style="display:block;width:100%;max-width:560px;border-radius:14px;border:1px solid #e5e7eb;">`
      : slideHtml
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">${slideHtml}</div>`
        : "";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to,
      subject: `Granska nytt Spreelo-inlägg – ${brandName || "kund"}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827">
          <p style="color:#9a412b;font-weight:800;letter-spacing:.06em">SPREELO ADMIN REVIEW</p>
          <h1 style="font-size:25px">Ett färdigt inlägg väntar på ditt godkännande</h1>
          ${mediaHtml}
          <div style="margin:18px 0;padding:18px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb;line-height:1.65">${formatContent(postContent)}</div>
          <a href="${escapeHtml(previewUrl)}" style="display:inline-block;padding:14px 22px;border-radius:11px;background:#0b1724;color:#fff;text-decoration:none;font-weight:700">Granska hela inlägget</a>
          <p style="color:#6b7280;font-size:13px">Kunden har ännu inte fått sitt godkännandemejl.</p>
        </div>
      `,
      text: `Ett färdigt Spreelo-inlägg för ${brandName || "kund"} väntar på granskning.\n\n${postContent}\n\n${previewUrl}`,
    }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Admin review email failed");
  }
  return { sent: true, result: await response.json().catch(() => ({})) };
}

export async function holdPostForAdminReview({
  supabase,
  resendApiKey,
  rule,
  postId,
  postContent,
  imageUrl = null,
  videoUrl = null,
  slides = [],
  brandName = "",
}) {
  const settings = await getAdminReviewSettings(supabase);
  const forcedRevisionReview = Boolean(rule?.admin_review_rerun_of_post_id);
  if (!settings.enabled && !forcedRevisionReview) {
    return { held: false, settings };
  }

  const previousPostId = rule?.admin_review_rerun_of_post_id || null;
  const rootPostId =
    rule?.admin_review_root_post_id || previousPostId || postId;
  let revision = 1;
  if (previousPostId) {
    const { data: previousReview } = await supabase
      .from("admin_post_reviews")
      .select("revision")
      .eq("post_id", previousPostId)
      .maybeSingle();
    revision = Math.max(2, Number(previousReview?.revision || 1) + 1);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("admin_post_reviews").upsert(
    {
      post_id: postId,
      previous_post_id: previousPostId,
      root_post_id: rootPostId,
      automation_rule_id: rule?.id || null,
      revision,
      status: "pending",
      requested_product_urls: Array.isArray(rule?.admin_product_override_urls)
        ? rule.admin_product_override_urls
        : [],
      updated_at: now,
    },
    { onConflict: "post_id" }
  );

  if (error) {
    // Never silently withhold a customer email if the review row was not
    // durably saved.
    console.error("Could not create admin post review; normal email flow continues", {
      postId,
      message: error.message,
    });
    return { held: false, settings, error: error.message };
  }

  const recipient =
    settings.reviewRecipient ||
    String(process.env.SPREELO_ADMIN_REVIEW_EMAIL || "").trim() ||
    String(process.env.SPREELO_ADMIN_EMAILS || "").split(",")[0]?.trim();

  let notificationSlides = Array.isArray(slides) ? slides : [];
  if (!notificationSlides.length) {
    const { data } = await supabase
      .from("post_slides")
      .select("slide_order, headline, image_url, product_url")
      .eq("post_id", postId)
      .order("slide_order", { ascending: true });
    notificationSlides = data || [];
  }

  if (recipient) {
    try {
      const result = await sendAdminReviewNotification({
        resendApiKey,
        to: recipient,
        postId,
        brandName,
        postContent,
        imageUrl,
        videoUrl,
        slides: notificationSlides,
      });
      if (result.sent) {
        await supabase
          .from("admin_post_reviews")
          .update({ admin_notified_at: now, updated_at: now })
          .eq("post_id", postId);
      }
    } catch (notificationError) {
      console.error("Admin review email failed; post remains visible in admin", {
        postId,
        message: notificationError.message,
      });
    }
  }

  return { held: true, settings };
}

export function buildCustomerApprovalReleaseEmail({
  post,
  slides = [],
  approveUrl,
  rejectUrl,
  brandName = "",
}) {
  const slideHtml = slides
    .filter((slide) => slide?.image_url)
    .slice(0, 6)
    .map(
      (slide) =>
        `<img src="${escapeHtml(slide.image_url)}" alt="" style="width:31%;min-width:130px;border-radius:10px;border:1px solid #e5e7eb;">`
    )
    .join("");
  const mediaHtml = post?.video_url
    ? `<p><a href="${escapeHtml(post.video_url)}">Visa den färdiga videon</a></p>`
    : post?.image_url
      ? `<img src="${escapeHtml(post.image_url)}" alt="" style="display:block;width:100%;max-width:584px;border-radius:14px;border:1px solid #e5e7eb;">`
      : slideHtml
        ? `<div style="display:flex;gap:8px;flex-wrap:wrap;">${slideHtml}</div>`
        : "";

  return {
    subject: `Ditt Spreelo-inlägg är klart${brandName ? ` – ${brandName}` : ""}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#111827">
        <p style="color:#6b7280;font-weight:800;letter-spacing:.06em">SPREELO</p>
        <h1 style="font-size:26px">Ditt planerade inlägg är klart för godkännande</h1>
        ${mediaHtml}
        <div style="margin:18px 0;padding:18px;border:1px solid #e5e7eb;border-radius:14px;background:#f9fafb;line-height:1.65">${formatContent(post?.content || "")}</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <a href="${escapeHtml(approveUrl)}" style="padding:14px 22px;border-radius:11px;background:#0b1724;color:#fff;text-decoration:none;font-weight:700">Godkänn inlägg</a>
          <a href="${escapeHtml(rejectUrl)}" style="padding:13px 20px;border-radius:11px;background:#fff7f1;color:#9a412b;border:1px solid #efc6b7;text-decoration:none;font-weight:700">Avvisa och förklara</a>
        </div>
      </div>
    `,
    text: `Ditt planerade Spreelo-inlägg är klart.\n\n${post?.content || ""}\n\nGodkänn: ${approveUrl}\nAvvisa: ${rejectUrl}`,
  };
}
