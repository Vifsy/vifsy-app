import { getAuthenticatedBillingUser } from "../../../../lib/stripeBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const context = await getAuthenticatedBillingUser(request);
  if (context.error) return Response.json({ ok: false, error: context.error }, { status: context.status });

  const { data, error } = await context.admin
    .from("user_credit_balances")
    .select("credits_remaining, monthly_credit_limit, plan_name, subscription_status, subscription_plan, current_period_start, current_period_end, credits_renewed_at, next_credit_refresh_at, cancel_at_period_end, payment_provider, provider_customer_id, provider_subscription_id, subscription_price_amount, subscription_currency, subscription_interval, subscription_price_lookup_key, purchased_credits_remaining")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, billing: data || null });
}
