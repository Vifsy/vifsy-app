import { getAuthenticatedBillingUser, getTrialEligibility, SPREELO_TRIAL_CREDITS, SPREELO_TRIAL_DAYS } from "../../../../lib/stripeBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  const context = await getAuthenticatedBillingUser(request);
  if (context.error) return Response.json({ ok: false, error: context.error }, { status: context.status });

  const { data, error } = await context.admin
    .from("user_credit_balances")
    .select("credits_remaining, monthly_credit_limit, plan_name, subscription_status, subscription_plan, current_period_start, current_period_end, credits_renewed_at, next_credit_refresh_at, cancel_at_period_end, payment_provider, provider_customer_id, provider_subscription_id, provider_subscription_schedule_id, subscription_price_amount, subscription_currency, subscription_interval, subscription_price_lookup_key, purchased_credits_remaining, trial_start, trial_end, pending_subscription_plan, pending_subscription_lookup_key, pending_subscription_effective_at")
    .eq("user_id", context.user.id)
    .maybeSingle();

  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  let trial = { eligible: false, reason: "unavailable", days: SPREELO_TRIAL_DAYS, credits: SPREELO_TRIAL_CREDITS };
  try {
    const status = String(data?.subscription_status || "").toLowerCase();
    if (!["active", "trialing", "past_due", "unpaid", "paused"].includes(status)) {
      trial = { ...(await getTrialEligibility(context.admin, context.user.id)), days: SPREELO_TRIAL_DAYS, credits: SPREELO_TRIAL_CREDITS };
    } else {
      trial = { eligible: false, reason: "subscription_exists", days: SPREELO_TRIAL_DAYS, credits: SPREELO_TRIAL_CREDITS };
    }
  } catch (trialError) {
    console.warn("Could not evaluate trial eligibility", { userId: context.user.id, message: trialError?.message });
  }

  return Response.json({ ok: true, billing: data || null, trial });
}
