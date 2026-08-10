import { getServerSupabase } from "../../../../lib/stripeBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorizedCron(request) {
  const configured = process.env.CRON_SECRET;
  if (!configured) return false;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${configured}`;
}

export async function GET(request) {
  if (!isAuthorizedCron(request)) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  const admin = getServerSupabase();
  const { data, error } = await admin.rpc("refresh_due_annual_subscription_credits", { p_limit: 500 });
  if (error) {
    console.error("Annual subscription credit refresh failed", { message: error.message });
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
  return Response.json({ ok: true, ...(data || {}) });
}
