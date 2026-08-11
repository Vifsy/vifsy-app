import { getAuthenticatedBillingUser, stripeRequest } from "../../../../../lib/stripeBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request) {
  try {
    const context = await getAuthenticatedBillingUser(request);
    if (context.error) return Response.json({ ok: false, error: context.error }, { status: context.status });
    const body = await request.json().catch(() => ({}));
    const resume = Boolean(body?.resume);

    const { data: billing, error } = await context.admin
      .from("user_credit_balances")
      .select("provider_subscription_id, subscription_status")
      .eq("user_id", context.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!billing?.provider_subscription_id || ["canceled", "cancelled"].includes(String(billing?.subscription_status || "").toLowerCase())) {
      return Response.json({ ok: false, error: "No active Stripe subscription was found." }, { status: 409 });
    }

    const subscription = await stripeRequest(`/v1/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}`, {
      method: "POST",
      params: { cancel_at_period_end: !resume },
    });

    await context.admin.from("user_credit_balances").update({
      cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
      updated_at: new Date().toISOString(),
    }).eq("user_id", context.user.id);

    return Response.json({ ok: true, cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end) });
  } catch (error) {
    console.error("Stripe cancel/resume failed", { message: error?.message, stripeCode: error?.stripeCode || null });
    return Response.json({ ok: false, error: error?.message || "Could not update subscription cancellation." }, { status: error?.status || 500 });
  }
}
