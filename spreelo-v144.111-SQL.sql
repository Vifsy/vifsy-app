-- Spreelo v144.111 — Rescue credit lifecycle + admin cancel/refund.
-- Run once in Supabase SQL Editor before deploying v144.111.
--
-- Key policy change:
-- * A terminal generation failure that is eligible for admin rescue no longer
--   refunds the customer's credit automatically.
-- * The failed occurrence keeps/consumes the credit while Spreelo attempts a
--   manual rescue. A recurring plan may reserve a separate credit for its next
--   future occurrence.
-- * Only an explicit admin action can cancel the failed occurrence and refund
--   the held rescue credit. That refund is idempotent and auditable.

begin;

create or replace function public.fail_automation_occurrence_terminal(
  p_occurrence_id uuid,
  p_failure_code text,
  p_internal_message text,
  p_customer_message text,
  p_failure_stage text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_keep_rule_active boolean default false,
  p_next_run_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
  v_rule public.automation_rules%rowtype;
  v_balance integer := 0;
  v_credit_cost integer := 0;
  v_held_credit integer := 0;
  v_next_credit integer := 0;
  v_plan_continues boolean := false;
  v_is_admin_test boolean := false;
begin
  select * into v_occurrence
  from public.automation_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Automation occurrence not found.';
  end if;

  if v_occurrence.status = 'failed_terminal' then
    return jsonb_build_object(
      'handled', false,
      'status', 'failed_terminal',
      'refunded_credits', coalesce(v_occurrence.refunded_credits, 0),
      'held_rescue_credits', greatest(coalesce((v_occurrence.metadata->>'rescue_credit_cost')::integer, 0), 0),
      'notification_status', v_occurrence.notification_status,
      'plan_continues', coalesce((v_occurrence.metadata->>'plan_continues')::boolean, false),
      'next_run_at', v_occurrence.metadata->>'next_run_at'
    );
  end if;

  if v_occurrence.status = 'completed' then
    return jsonb_build_object('handled', false, 'status', 'completed', 'refunded_credits', 0, 'held_rescue_credits', 0);
  end if;

  select * into v_rule
  from public.automation_rules
  where id = v_occurrence.automation_rule_id
  for update;

  if found then
    v_is_admin_test := coalesce(v_occurrence.is_admin_test, false) or coalesce(v_rule.is_admin_test, false);
    v_credit_cost := greatest(coalesce(v_rule.credit_cost, 1), 1);

    -- Normal content plans reserve the next occurrence up front, so the balance
    -- was already reduced before generation started. On failure we consume that
    -- reservation for the rescue case instead of returning it.
    if not v_is_admin_test and v_rule.credit_reservation_status = 'reserved' then
      v_held_credit := greatest(coalesce(v_rule.credit_reserved_amount, v_credit_cost), 1);

      insert into public.credit_reservation_events (
        user_id,
        automation_rule_id,
        brand_profile_id,
        rule_name,
        content_type_id,
        event_type,
        amount,
        reason,
        metadata
      ) values (
        v_rule.user_id,
        v_rule.id,
        v_rule.brand_profile_id,
        v_rule.name,
        v_rule.content_type_id,
        'consumed_for_admin_rescue',
        0,
        'Reserved credits remain consumed while the failed occurrence is held for Spreelo admin rescue',
        jsonb_build_object(
          'occurrence_id', p_occurrence_id,
          'failure_code', p_failure_code,
          'credit_cost', v_held_credit
        )
      );
    elsif not v_is_admin_test and coalesce(p_failure_code, '') <> 'insufficient_credits' then
      -- Legacy/non-reserved paths normally charge only after a successful post.
      -- A rescueable terminal failure must still have one customer credit tied
      -- to it, otherwise a manual rescue would create a free post. Charge once
      -- here when the account has enough balance.
      select credits_remaining into v_balance
      from public.user_credit_balances
      where user_id = v_rule.user_id
      for update;

      if found and v_balance >= v_credit_cost then
        update public.user_credit_balances
        set credits_remaining = credits_remaining - v_credit_cost,
            updated_at = now()
        where user_id = v_rule.user_id;

        v_held_credit := v_credit_cost;

        insert into public.credit_reservation_events (
          user_id,
          automation_rule_id,
          brand_profile_id,
          rule_name,
          content_type_id,
          event_type,
          amount,
          reason,
          metadata
        ) values (
          v_rule.user_id,
          v_rule.id,
          v_rule.brand_profile_id,
          v_rule.name,
          v_rule.content_type_id,
          'charged_for_admin_rescue',
          -v_held_credit,
          'Credits charged once because the failed occurrence is being held for Spreelo admin rescue',
          jsonb_build_object(
            'occurrence_id', p_occurrence_id,
            'failure_code', p_failure_code,
            'credit_cost', v_held_credit
          )
        );
      end if;
    end if;

    v_plan_continues := coalesce(p_keep_rule_active, false) and p_next_run_at is not null;

    -- The failed occurrence's held credit and the next recurring occurrence's
    -- reservation are two separate things. Reserve another credit for the next
    -- weekly slot only if the balance can fund it; otherwise pause the plan.
    if v_plan_continues and not v_is_admin_test then
      select credits_remaining into v_balance
      from public.user_credit_balances
      where user_id = v_rule.user_id
      for update;

      v_next_credit := v_credit_cost;
      if not found or v_balance < v_next_credit then
        v_plan_continues := false;
        v_next_credit := 0;
      else
        update public.user_credit_balances
        set credits_remaining = credits_remaining - v_next_credit,
            updated_at = now()
        where user_id = v_rule.user_id;

        insert into public.credit_reservation_events (
          user_id,
          automation_rule_id,
          brand_profile_id,
          rule_name,
          content_type_id,
          event_type,
          amount,
          reason,
          metadata
        ) values (
          v_rule.user_id,
          v_rule.id,
          v_rule.brand_profile_id,
          v_rule.name,
          v_rule.content_type_id,
          'recurring_reserved_after_rescue_failure',
          -v_next_credit,
          'Credits reserved for the next recurring post while the failed occurrence remains in admin rescue',
          jsonb_build_object(
            'occurrence_id', p_occurrence_id,
            'failure_code', p_failure_code,
            'next_run_at', p_next_run_at
          )
        );
      end if;
    end if;

    update public.automation_rules
    set is_active = case when v_is_admin_test then coalesce(p_keep_rule_active, false) else v_plan_continues end,
        next_run_at = case
          when v_is_admin_test and coalesce(p_keep_rule_active, false) then p_next_run_at
          when v_plan_continues then p_next_run_at
          else null
        end,
        queue_locked_until = null,
        retry_not_before = null,
        product_retry_attempt = 0,
        product_retry_reason = null,
        last_error = left(coalesce(p_internal_message, p_customer_message, 'Automation generation failed'), 1200),
        generation_occurrence_status = 'failed_terminal',
        generation_occurrence_scheduled_for = v_occurrence.scheduled_for,
        generation_finished_at = now(),
        generation_failure_code = nullif(trim(coalesce(p_failure_code, '')), ''),
        generation_failure_message = left(coalesce(p_internal_message, ''), 4000),
        generation_customer_message = left(coalesce(p_customer_message, ''), 1200),
        generation_failure_stage = nullif(trim(coalesce(p_failure_stage, '')), ''),
        generation_refunded_credits = 0,
        generation_notification_status = 'suppressed',
        generation_notification_sent_at = null,
        credit_reservation_status = case
          when v_is_admin_test then v_rule.credit_reservation_status
          when v_plan_continues and v_next_credit > 0 then 'reserved'
          when v_held_credit > 0 then 'consumed'
          else v_rule.credit_reservation_status
        end,
        credit_reserved_amount = case
          when v_is_admin_test then v_rule.credit_reserved_amount
          when v_plan_continues and v_next_credit > 0 then v_next_credit
          when v_held_credit > 0 then 0
          else v_rule.credit_reserved_amount
        end,
        credit_consumed_at = case
          when not v_is_admin_test and v_held_credit > 0 then now()
          else v_rule.credit_consumed_at
        end,
        credit_reserved_at = case
          when not v_is_admin_test and v_plan_continues and v_next_credit > 0 then now()
          else v_rule.credit_reserved_at
        end,
        credit_released_at = case
          when not v_is_admin_test and v_plan_continues and v_next_credit > 0 then null
          else v_rule.credit_released_at
        end,
        updated_at = now()
    where id = v_rule.id;
  end if;

  update public.automation_occurrences
  set status = 'failed_terminal',
      finished_at = now(),
      failure_code = nullif(trim(coalesce(p_failure_code, '')), ''),
      failure_stage = nullif(trim(coalesce(p_failure_stage, '')), ''),
      failure_message_internal = left(coalesce(p_internal_message, ''), 4000),
      failure_message_customer = left(coalesce(p_customer_message, ''), 1200),
      refunded_credits = 0,
      notification_status = 'suppressed',
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'admin_rescue_required', true,
          'rescue_credit_held', v_held_credit > 0,
          'rescue_credit_cost', v_held_credit,
          'rescue_credit_refunded', false,
          'rescue_credit_refund_available', v_held_credit > 0,
          'plan_continues', v_plan_continues,
          'next_run_at', case when v_plan_continues then p_next_run_at else null end
        ),
      updated_at = now()
  where id = p_occurrence_id;

  update public.automation_run_logs
  set occurrence_id = p_occurrence_id,
      failure_code = nullif(trim(coalesce(p_failure_code, '')), ''),
      failure_customer_message = left(coalesce(p_customer_message, ''), 1200),
      refunded_credits = 0,
      notification_status = 'suppressed',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'admin_rescue_required', true,
        'rescue_credit_cost', v_held_credit,
        'rescue_credit_refunded', false
      ),
      updated_at = now()
  where id = v_occurrence.run_log_id;

  return jsonb_build_object(
    'handled', true,
    'status', 'failed_terminal',
    'refunded_credits', 0,
    'held_rescue_credits', v_held_credit,
    'notification_status', 'suppressed',
    'plan_continues', v_plan_continues,
    'next_run_at', case when v_plan_continues then p_next_run_at else null end,
    'next_credit_reserved', v_plan_continues and v_next_credit > 0,
    'user_id', v_occurrence.user_id,
    'brand_profile_id', v_occurrence.brand_profile_id,
    'automation_rule_id', v_occurrence.automation_rule_id
  );
end;
$$;

-- Explicit admin-only refund for a failed occurrence after Spreelo gives up on
-- manual rescue. It never releases a separate reservation for the next weekly
-- occurrence and it can be called repeatedly without double-refunding.
create or replace function public.cancel_failed_automation_occurrence_and_refund(
  p_occurrence_id uuid,
  p_admin_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
  v_rule public.automation_rules%rowtype;
  v_refund integer := 0;
  v_already_refunded integer := 0;
begin
  select * into v_occurrence
  from public.automation_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Automation occurrence not found.';
  end if;

  if v_occurrence.status <> 'failed_terminal' then
    raise exception 'Only a terminally failed occurrence can be cancelled and refunded.';
  end if;

  if v_occurrence.metadata ? 'admin_rescue_resolved_at'
     or coalesce((v_occurrence.metadata->>'rescue_credit_resolved_with_post')::boolean, false) then
    raise exception 'The failed occurrence has already been successfully rescued and its credit cannot be refunded.';
  end if;

  v_already_refunded := greatest(coalesce(v_occurrence.refunded_credits, 0), 0);
  if v_already_refunded > 0 or coalesce((v_occurrence.metadata->>'rescue_credit_refunded')::boolean, false) then
    return jsonb_build_object(
      'handled', false,
      'already_refunded', true,
      'refunded_credits', v_already_refunded,
      'user_id', v_occurrence.user_id,
      'automation_rule_id', v_occurrence.automation_rule_id
    );
  end if;

  if coalesce(v_occurrence.is_admin_test, false) then
    v_refund := 0;
  else
    v_refund := greatest(coalesce((v_occurrence.metadata->>'rescue_credit_cost')::integer, 0), 0);
  end if;

  select * into v_rule
  from public.automation_rules
  where id = v_occurrence.automation_rule_id;

  if v_refund > 0 then
    update public.user_credit_balances
    set credits_remaining = credits_remaining + v_refund,
        updated_at = now()
    where user_id = v_occurrence.user_id;

    if not found then
      raise exception 'Customer credit balance was not found; refund was not applied.';
    end if;

    insert into public.credit_reservation_events (
      user_id,
      automation_rule_id,
      brand_profile_id,
      rule_name,
      content_type_id,
      event_type,
      amount,
      reason,
      metadata
    ) values (
      v_occurrence.user_id,
      v_occurrence.automation_rule_id,
      v_occurrence.brand_profile_id,
      v_rule.name,
      v_rule.content_type_id,
      'admin_cancelled_failed_occurrence_refund',
      v_refund,
      'Admin ended the failed occurrence after rescue could not be completed and refunded its held credit',
      jsonb_build_object(
        'occurrence_id', p_occurrence_id,
        'failure_code', v_occurrence.failure_code,
        'admin_user_id', p_admin_user_id
      )
    );
  end if;

  update public.automation_occurrences
  set refunded_credits = v_refund,
      notification_status = 'pending',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'admin_rescue_cancelled_at', now(),
        'admin_rescue_cancelled_by', p_admin_user_id,
        'rescue_credit_refunded', true,
        'rescue_credit_refund_available', false,
        'rescue_refund_amount', v_refund
      ),
      updated_at = now()
  where id = p_occurrence_id;

  update public.automation_run_logs
  set refunded_credits = v_refund,
      notification_status = 'pending',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'admin_rescue_cancelled_at', now(),
        'rescue_credit_refunded', true,
        'rescue_refund_amount', v_refund
      ),
      updated_at = now()
  where occurrence_id = p_occurrence_id
     or id = v_occurrence.run_log_id;

  -- Do not alter the rule's current credit reservation: for a recurring plan it
  -- may already represent a different, future occurrence.
  return jsonb_build_object(
    'handled', true,
    'already_refunded', false,
    'refunded_credits', v_refund,
    'user_id', v_occurrence.user_id,
    'brand_profile_id', v_occurrence.brand_profile_id,
    'automation_rule_id', v_occurrence.automation_rule_id,
    'failure_code', v_occurrence.failure_code,
    'failure_message_customer', v_occurrence.failure_message_customer,
    'scheduled_for', v_occurrence.scheduled_for
  );
end;
$$;

revoke all on function public.cancel_failed_automation_occurrence_and_refund(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_failed_automation_occurrence_and_refund(uuid, uuid) to service_role;

-- Existing terminal-failure RPC remains service-role only after replacement.
revoke all on function public.fail_automation_occurrence_terminal(uuid, text, text, text, text, jsonb, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.fail_automation_occurrence_terminal(uuid, text, text, text, text, jsonb, boolean, timestamptz) to service_role;

commit;
