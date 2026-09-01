import { getAuthenticatedBillingUser } from "../../../../lib/stripeBilling";
import { loadPlanUsage } from "../../../../lib/planEntitlements";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  try {
    const context = await getAuthenticatedBillingUser(request);
    if (context.error) return Response.json({ ok: false, error: context.error }, { status: context.status });
    const brandProfileId = String(new URL(request.url).searchParams.get("brand_profile_id") || "").trim() || null;
    const usage = await loadPlanUsage(context.admin, context.user.id, { brandProfileId });
    return Response.json({ ok: true, ...usage });
  } catch (error) {
    console.error("Plan usage lookup failed", { message: error?.message });
    return Response.json({ ok: false, error: error?.message || "Could not load plan usage." }, { status: 500 });
  }
}
