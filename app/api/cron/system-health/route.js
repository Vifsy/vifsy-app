import { createClient } from "@supabase/supabase-js";
import { runSystemHealthChecks } from "../../../../lib/systemHealth.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request) {
  const secret = String(process.env.CRON_SECRET || "");
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request) {
  if (!authorized(request)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const health = await runSystemHealthChecks({ admin: adminClient(), persist: true });
    const problemCount = health.checks.filter((item) => ["down", "degraded"].includes(item.status)).length;
    return Response.json({ ok: true, problemCount, ...health });
  } catch (error) {
    return Response.json({ ok: false, error: error?.message || "System health check failed." }, { status: 500 });
  }
}
