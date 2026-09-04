import { getServerTranslations } from "./i18n/serverUiText.js";
import { getUserEmailAndAppLocale } from "./userAppLocale.js";

const APP_URL = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.spreelo.com").replace(/\/$/, "");
const FROM = process.env.RESEND_FROM_EMAIL || "Spreelo <noreply@spreelo.com>";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function reasonKeyForFailureCode(value) {
  const code = String(value || "").toLowerCase();
  if (/website|security|blocked|403|crawl|fetch|source/.test(code)) return "emails.failedRefunded.reasonWebsite";
  if (/product|catalog|item|stock|identity|suitable/.test(code)) return "emails.failedRefunded.reasonProduct";
  if (/image|video|kling|media|render|visual/.test(code)) return "emails.failedRefunded.reasonMedia";
  return "emails.failedRefunded.reasonTechnical";
}

function localizedPostType(t, rawValue) {
  const raw = String(rawValue || "").toLowerCase();
  if (/carousel|karusell/.test(raw)) return t("emails.approval.formatCarousel");
  if (/video|reel|animated|animerad/.test(raw)) return t("emails.approval.formatAnimatedVideo");
  if (/ad|annons/.test(raw)) return t("emails.approval.formatWebsiteAd");
  if (/product|produkt|website_item/.test(raw)) return t("emails.approval.formatWebsiteProduct");
  if (/image|bild/.test(raw)) return t("emails.approval.formatImage");
  if (/text/.test(raw)) return t("emails.approval.formatText");
  return t("emails.approval.post");
}

export async function sendFailedOccurrenceRefundedEmail({
  supabaseAdmin,
  userId,
  brandName,
  postType,
  failureCode,
  refundedCredits,
}) {
  const profile = await getUserEmailAndAppLocale({
    supabaseAdmin,
    userId,
    fallbackLocale: "en",
  });
  if (!profile.email) throw new Error("Customer email is missing.");

  const { locale, t } = await getServerTranslations({
    supabaseAdmin,
    locale: profile.locale,
    namespaces: ["emails"],
  });

  const safeBrand = String(brandName || "Spreelo").trim() || "Spreelo";
  const safePostType = localizedPostType(t, postType);
  const credits = Math.max(0, Number(refundedCredits || 0));
  const reason = t(reasonKeyForFailureCode(failureCode));
  const values = { brand: safeBrand, postType: safePostType, credits };
  const subject = t("emails.failedRefunded.subject", values);
  const title = t("emails.failedRefunded.title", values);
  const intro = t("emails.failedRefunded.intro", values);
  const refund = t("emails.failedRefunded.refund", values);
  const nextTitle = t("emails.failedRefunded.nextTitle", values);
  const nextText = t("emails.failedRefunded.nextText", values);
  const button = t("emails.failedRefunded.button", values);
  const security = t("emails.failedRefunded.security", values);
  const eyebrow = t("emails.failedRefunded.eyebrow", values);
  const reasonLabel = t("emails.failedRefunded.reasonLabel", values);
  const url = `${APP_URL}/calendar?lang=${encodeURIComponent(locale)}`;

  const html = `<!doctype html><html lang="${escapeHtml(locale)}"><body style="margin:0;background:#f2eee8;font-family:Arial,sans-serif;color:#101828">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2eee8"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:690px;background:#fffdfa;border:1px solid #e3d8d0;border-radius:22px;overflow:hidden">
      <tr><td style="padding:31px 30px 26px;background:linear-gradient(135deg,#0b1c2c,#153c58);color:#fff">
        <div style="font-size:22px;font-weight:800">spreelo</div>
        <div style="margin-top:26px;color:#ff9b81;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.10em">${escapeHtml(eyebrow)}</div>
        <h1 style="margin:9px 0 11px;font-size:30px;line-height:1.16">${escapeHtml(title)}</h1>
        <p style="margin:0;color:#d8e3ec;font-size:15px;line-height:1.7">${escapeHtml(intro)}</p>
      </td></tr>
      <tr><td style="padding:24px 30px 6px">
        <div style="padding:17px 18px;border:1px solid #eadfd7;border-radius:14px;background:#fff8f4">
          <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#9a4b34">${escapeHtml(reasonLabel)}</div>
          <p style="margin:8px 0 0;color:#5f6877;font-size:14px;line-height:1.65">${escapeHtml(reason)}</p>
        </div>
      </td></tr>
      <tr><td style="padding:18px 30px 4px"><div style="padding:16px 18px;border-radius:14px;background:#edf8f1;border:1px solid #cce8d5;color:#155d35;font-weight:800">${escapeHtml(refund)}</div></td></tr>
      <tr><td style="padding:23px 30px 28px"><h2 style="margin:0 0 8px;font-size:19px">${escapeHtml(nextTitle)}</h2><p style="margin:0 0 21px;color:#667085;font-size:14px;line-height:1.7">${escapeHtml(nextText)}</p><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 21px;border-radius:11px;background:#f25f43;color:#fff;text-decoration:none;font-size:14px;font-weight:800">${escapeHtml(button)} →</a></td></tr>
      <tr><td style="padding:18px 30px;background:#fff7f1;border-top:1px solid #efe1d8;color:#786b64;font-size:12px;line-height:1.65">${escapeHtml(security)}</td></tr>
    </table>
  </td></tr></table></body></html>`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: profile.email,
      subject,
      html,
      text: `${title}\n\n${intro}\n\n${reasonLabel}: ${reason}\n\n${refund}\n\n${nextTitle}\n${nextText}\n\n${button}: ${url}`,
    }),
  });
  if (!response.ok) throw new Error((await response.text()) || "Resend rejected the email.");
  return { sent: true, locale, recipient: profile.email, subject };
}
