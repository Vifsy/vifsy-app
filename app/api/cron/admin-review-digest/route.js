import { createClient } from "@supabase/supabase-js";
import { getConfiguredAdminEmails } from "../../../../lib/adminAuth.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const legacyRecipients = String(process.env.ADMIN_ALERT_EMAIL || "")
    .split(/[;,\n\r]+/).map((value) => value.trim().toLowerCase()).filter(Boolean);
  const recipients = [...new Set([...getConfiguredAdminEmails(), ...legacyRecipients])];
  if (!recipients.length) return Response.json({ ok: true, sent: false, reason: "no_admin_recipient" });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const hourKey = new Date();
  hourKey.setUTCMinutes(0, 0, 0);
  const { data: existing } = await supabase.from("admin_review_digest_runs").select("hour_key").eq("hour_key", hourKey.toISOString()).maybeSingle();
  if (existing) return Response.json({ ok: true, sent: false, reason: "already_sent" });
  const [{ count: awaiting }, { count: repair }] = await Promise.all([
    supabase.from("admin_review_cases").select("id", { count: "exact", head: true }).eq("status", "awaiting_spreelo").eq("needs_review", true),
    supabase.from("admin_review_cases").select("id", { count: "exact", head: true }).eq("status", "needs_repair").eq("needs_review", true),
  ]);
  const awaitingCount = Number(awaiting || 0);
  const repairCount = Number(repair || 0);
  if (awaitingCount + repairCount === 0) return Response.json({ ok: true, sent: false, reason: "empty" });
  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.spreelo.com").replace(/\/$/, "");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Spreelo <noreply@spreelo.com>",
      to: recipients,
      subject: `${awaitingCount + repairCount} Spreelo posts need attention`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033"><p style="color:#d65337;font-weight:800;letter-spacing:.08em">SPREELO · ADMIN REVIEW</p><h1 style="font-size:26px">New posts are waiting</h1><p><strong>${awaitingCount}</strong> ready for review and <strong>${repairCount}</strong> need repair.</p><a href="${appUrl}/admin/post-approvals" style="display:inline-block;background:#0b1724;color:white;text-decoration:none;padding:13px 18px;border-radius:10px;font-weight:700">Open review workbench</a></div>`,
      text: `${awaitingCount} posts await review and ${repairCount} need repair.\n${appUrl}/admin/post-approvals`,
    }),
  });
  if (!response.ok) return Response.json({ ok: false, error: await response.text() }, { status: 502 });
  const provider = await response.json().catch(() => ({}));
  await supabase.from("admin_review_digest_runs").insert({ hour_key: hourKey.toISOString(), recipient: recipients.join(","), awaiting_count: awaitingCount, repair_count: repairCount, sent_at: new Date().toISOString(), provider_id: provider?.id || null });
  await supabase.from("admin_review_cases").update({ digest_notified_at: new Date().toISOString() }).in("status", ["awaiting_spreelo", "needs_repair"]).eq("needs_review", true);
  return Response.json({ ok: true, sent: true, awaitingCount, repairCount });
}
