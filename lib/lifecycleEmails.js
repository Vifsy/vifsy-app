import {
  getServerTranslations,
  resolveBestServerLocale,
} from "./i18n/serverUiText.js";

const DEFAULT_APP_URL = "https://app.spreelo.com";
const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Spreelo <noreply@spreelo.com>";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getAppUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL)
    .trim()
    .replace(/\/$/, "");
}

function buildEmailHtml({ eyebrow, title, intro, highlights, nextTitle, nextText, button, buttonUrl, security }) {
  const highlightHtml = (highlights || [])
    .filter(Boolean)
    .map(
      (item) => `<td style="width:50%;padding:8px;vertical-align:top">
        <div style="min-height:52px;padding:15px 16px;border:1px solid #e8ddd5;border-radius:13px;background:#fffaf6;color:#1a2433;font-size:14px;font-weight:700;line-height:1.45">${escapeHtml(item)}</div>
      </td>`
    )
    .join("");

  return `<!doctype html><html><body style="margin:0;background:#f2eee8;font-family:Arial,sans-serif;color:#101828">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 10px;background:#f2eee8"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:690px;border:1px solid #e3d8d0;border-radius:22px;overflow:hidden;background:#fffdfa;box-shadow:0 16px 48px rgba(29,37,48,.10)">
      <tr><td style="padding:32px 34px 27px;background:linear-gradient(135deg,#0b1c2c,#153c58);color:#fff">
        <div style="font-size:22px;font-weight:800;letter-spacing:-.03em">spreelo</div>
        <div style="margin-top:28px;color:#ff9b81;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.10em">${escapeHtml(eyebrow)}</div>
        <h1 style="margin:9px 0 11px;font-size:31px;line-height:1.14;letter-spacing:-.025em">${escapeHtml(title)}</h1>
        <p style="margin:0;max-width:540px;color:#d8e3ec;font-size:15px;line-height:1.7">${escapeHtml(intro)}</p>
      </td></tr>
      ${highlightHtml ? `<tr><td style="padding:22px 24px 2px"><table width="100%" cellpadding="0" cellspacing="0" role="presentation"><tr>${highlightHtml}</tr></table></td></tr>` : ""}
      <tr><td style="padding:25px 34px 28px">
        <h2 style="margin:0 0 8px;font-size:19px;line-height:1.35">${escapeHtml(nextTitle)}</h2>
        <p style="margin:0 0 21px;color:#667085;font-size:14px;line-height:1.7">${escapeHtml(nextText)}</p>
        <a href="${escapeHtml(buttonUrl)}" style="display:inline-block;padding:14px 21px;border-radius:11px;background:#f25f43;color:#fff;text-decoration:none;font-size:14px;font-weight:800">${escapeHtml(button)} &nbsp;→</a>
      </td></tr>
      <tr><td style="padding:18px 34px;background:#fff7f1;border-top:1px solid #efe1d8;color:#786b64;font-size:12px;line-height:1.65">${escapeHtml(security)}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

async function updateLifecycleEmail({ supabaseAdmin, userId, emailType, entityKey, updates }) {
  const { error } = await supabaseAdmin
    .from("user_lifecycle_emails")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("email_type", emailType)
    .eq("entity_key", entityKey);

  if (error) throw error;
}

export async function sendLifecycleEmail({
  supabaseAdmin,
  userId,
  emailType,
  entityKey = "account",
  locale = "en",
  brandName = "Spreelo",
  campaignCount = 0,
  destinationPath = "/",
}) {
  if (!supabaseAdmin || !userId || !emailType) {
    throw new Error("Lifecycle email is missing required context.");
  }

  const resolvedLocale = resolveBestServerLocale({
    languageCandidates: [locale],
  });
  const safeEntityKey = String(entityKey || "account").slice(0, 180);
  const { data: claimed, error: claimError } = await supabaseAdmin.rpc(
    "claim_user_lifecycle_email",
    {
      p_user_id: userId,
      p_email_type: emailType,
      p_entity_key: safeEntityKey,
      p_locale: resolvedLocale,
    }
  );

  if (claimError) throw claimError;
  if (!claimed) return { sent: false, skipped: true, reason: "already_claimed" };

  try {
    const { data: authUser, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    const email = String(authUser?.user?.email || "").trim();
    if (userError || !email) {
      throw userError || new Error("The account has no email address.");
    }

    const { t } = await getServerTranslations({
      supabaseAdmin,
      locale: resolvedLocale,
      namespaces: ["emails"],
    });

    const isAnalysisComplete = emailType === "analysis_completed";
    const safeBrandName = String(brandName || "Spreelo").trim() || "Spreelo";
    const loginUrl = `${getAppUrl()}/login?next=${encodeURIComponent(destinationPath)}&lang=${encodeURIComponent(resolvedLocale)}`;
    const subject = isAnalysisComplete
      ? t("emails.analysisCompleted.subject", { brand: safeBrandName })
      : t("emails.welcome.subject");
    const title = isAnalysisComplete
      ? t("emails.analysisCompleted.title", { brand: safeBrandName })
      : t("emails.welcome.title");
    const intro = isAnalysisComplete
      ? t("emails.analysisCompleted.intro")
      : t("emails.welcome.intro");
    const nextTitle = isAnalysisComplete
      ? t("emails.analysisCompleted.nextTitle")
      : t("emails.welcome.nextTitle");
    const nextText = isAnalysisComplete
      ? t("emails.analysisCompleted.nextText")
      : t("emails.welcome.nextText");
    const button = isAnalysisComplete
      ? t("emails.analysisCompleted.button")
      : t("emails.welcome.button");
    const security = isAnalysisComplete
      ? t("emails.analysisCompleted.security")
      : t("emails.welcome.security");
    const highlights = isAnalysisComplete
      ? [
          t("emails.analysisCompleted.profile"),
          t("emails.analysisCompleted.calendar", { count: campaignCount }),
        ]
      : [];

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
        to: email,
        subject,
        html: buildEmailHtml({
          eyebrow: isAnalysisComplete
            ? t("emails.analysisCompleted.eyebrow")
            : t("emails.welcome.eyebrow"),
          title,
          intro,
          highlights,
          nextTitle,
          nextText,
          button,
          buttonUrl: loginUrl,
          security,
        }),
        text: `${title}\n\n${intro}\n\n${nextTitle}\n${nextText}\n\n${button}: ${loginUrl}\n\n${security}`,
      }),
    });

    if (!response.ok) {
      throw new Error((await response.text()) || "Resend rejected the email.");
    }

    await updateLifecycleEmail({
      supabaseAdmin,
      userId,
      emailType,
      entityKey: safeEntityKey,
      updates: {
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      },
    });

    return { sent: true };
  } catch (error) {
    await updateLifecycleEmail({
      supabaseAdmin,
      userId,
      emailType,
      entityKey: safeEntityKey,
      updates: {
        status: "failed",
        last_error: String(error?.message || "Email delivery failed").slice(0, 2000),
      },
    }).catch(() => {});
    throw error;
  }
}

