import {
  getAuthenticatedBillingUser,
  stripeRequest,
} from "../../../../../../lib/stripeBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getScheduleId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value?.id || "");
}

export async function POST(request) {
  try {
    const context = await getAuthenticatedBillingUser(request);
    if (context.error) {
      return Response.json({ ok: false, error: context.error }, { status: context.status });
    }

    const { data: billing, error: billingError } = await context.admin
      .from("user_credit_balances")
      .select("provider_subscription_id, provider_subscription_schedule_id, pending_subscription_plan, pending_subscription_lookup_key, pending_subscription_effective_at")
      .eq("user_id", context.user.id)
      .maybeSingle();

    if (billingError) throw new Error(billingError.message);

    const hasPendingChange = Boolean(
      billing?.pending_subscription_plan ||
      billing?.pending_subscription_lookup_key ||
      billing?.provider_subscription_schedule_id
    );

    if (!hasPendingChange) {
      return Response.json({ ok: true, unchanged: true });
    }

    const effectiveAtMs = billing?.pending_subscription_effective_at
      ? new Date(billing.pending_subscription_effective_at).getTime()
      : NaN;
    if (Number.isFinite(effectiveAtMs) && effectiveAtMs <= Date.now()) {
      return Response.json(
        { ok: false, error: "The scheduled plan change is already taking effect. Refresh your billing status and try again." },
        { status: 409 }
      );
    }

    let scheduleId = getScheduleId(billing?.provider_subscription_schedule_id);

    if (!scheduleId && billing?.provider_subscription_id) {
      const subscription = await stripeRequest(
        `/v1/subscriptions/${encodeURIComponent(billing.provider_subscription_id)}`
      );
      scheduleId = getScheduleId(subscription?.schedule);
    }

    if (scheduleId) {
      try {
        await stripeRequest(
          `/v1/subscription_schedules/${encodeURIComponent(scheduleId)}/release`,
          { method: "POST" }
        );
      } catch (stripeError) {
        const message = String(stripeError?.message || "");
        const alreadyInactive = /no such subscription schedule|already released|already canceled|already cancelled/i.test(message);
        if (!alreadyInactive) throw stripeError;
      }
    }

    const { error: clearError } = await context.admin
      .from("user_credit_balances")
      .update({
        pending_subscription_plan: null,
        pending_subscription_lookup_key: null,
        pending_subscription_effective_at: null,
        provider_subscription_schedule_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.user.id);

    if (clearError) throw new Error(`Could not clear the scheduled plan change: ${clearError.message}`);

    let auditQuery = context.admin
      .from("stripe_plan_changes")
      .update({ status: "canceled", updated_at: new Date().toISOString() })
      .eq("user_id", context.user.id)
      .eq("status", "scheduled");

    auditQuery = scheduleId
      ? auditQuery.eq("schedule_id", scheduleId)
      : auditQuery.eq("target_lookup_key", billing?.pending_subscription_lookup_key || "");

    const { error: auditError } = await auditQuery;
    if (auditError) {
      console.warn("Scheduled plan change was canceled but its audit row could not be updated", {
        userId: context.user.id,
        scheduleId: scheduleId || null,
        message: auditError.message,
      });
    }

    return Response.json({ ok: true, canceled: true });
  } catch (error) {
    console.error("Cancel scheduled Stripe plan change failed", {
      message: error?.message,
      stripeCode: error?.stripeCode || null,
    });
    return Response.json(
      { ok: false, error: error?.message || "Could not cancel the scheduled plan change." },
      { status: error?.status || 500 }
    );
  }
}
