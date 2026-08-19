-- Spreelo v144.00: delivery-first resilience for transient automation failures.
-- Run once in Supabase SQL Editor before deploying v144.00.
--
-- Goal: a temporary API/network timeout should pause the SAME scheduled
-- occurrence briefly and let the existing atomic claim flow resume it, rather
-- than immediately turning the occurrence into a terminal customer failure.

begin;

create or replace function public.defer_automation_occurrence_for_transient_failure(
  p_occurrence_id uuid,
  p_retry_after_ms integer default 90000,
  p_internal_message text default null,
  p_failure_stage text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_max_retries integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
  v_retry_count integer := 0;
  v_max_retries integer := greatest(1, least(4, coalesce(p_max_retries, 2)));
  v_retry_ms bigint := greatest(30000, least(600000, coalesce(p_retry_after_ms, 90000)));
  v_retry_at timestamptz := clock_timestamp() + make_interval(secs => v_retry_ms::double precision / 1000.0);
begin
  select * into v_occurrence
  from public.automation_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Automation occurrence not found.';
  end if;

  if v_occurrence.status in ('completed', 'failed_terminal') then
    return jsonb_build_object(
      'handled', false,
      'exhausted', true,
      'status', v_occurrence.status,
      'retry_count', coalesce(v_occurrence.retry_count, 0)
    );
  end if;

  v_retry_count := coalesce(v_occurrence.retry_count, 0) + 1;

  if v_retry_count > v_max_retries then
    return jsonb_build_object(
      'handled', false,
      'exhausted', true,
      'status', v_occurrence.status,
      'retry_count', v_retry_count,
      'max_retries', v_max_retries
    );
  end if;

  update public.automation_occurrences
  set status = 'retry_pending',
      retry_count = v_retry_count,
      retry_not_before = v_retry_at,
      failure_code = 'transient_runtime_failure',
      failure_stage = p_failure_stage,
      failure_message_internal = p_internal_message,
      failure_message_customer = 'A temporary technical dependency did not respond in time. Spreelo will continue automatically.',
      notification_status = 'suppressed',
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'transient_retry', true,
          'retry_at', v_retry_at,
          'retry_after_ms', v_retry_ms,
          'retry_count', v_retry_count,
          'max_retries', v_max_retries
        ),
      updated_at = clock_timestamp()
  where id = p_occurrence_id;

  update public.automation_rules
  set is_active = true,
      queue_locked_until = null,
      retry_not_before = v_retry_at,
      product_retry_reason = p_internal_message,
      last_error = null,
      generation_occurrence_status = 'retry_pending',
      generation_finished_at = null,
      generation_failure_code = 'transient_runtime_failure',
      generation_failure_message = p_internal_message,
      generation_customer_message = 'Ett tillfälligt tekniskt beroende svarade inte i tid. Spreelo fortsätter automatiskt.',
      generation_failure_stage = p_failure_stage,
      generation_refunded_credits = 0,
      generation_notification_status = 'suppressed',
      updated_at = clock_timestamp()
  where id = v_occurrence.automation_rule_id;

  return jsonb_build_object(
    'handled', true,
    'exhausted', false,
    'status', 'retry_pending',
    'retry_at', v_retry_at,
    'retry_after_ms', v_retry_ms,
    'retry_count', v_retry_count,
    'max_retries', v_max_retries
  );
end;
$$;

grant execute on function public.defer_automation_occurrence_for_transient_failure(
  uuid, integer, text, text, jsonb, integer
) to service_role;

commit;
