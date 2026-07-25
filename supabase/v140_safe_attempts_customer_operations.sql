-- Spreelo v140: one automatic generation attempt per scheduled occurrence,
-- terminal failure/refund tracking, customer notifications and admin operations.
-- Run once in Supabase SQL Editor before deploying v140.

create extension if not exists pgcrypto;

alter table public.automation_rules
  add column if not exists generation_occurrence_status text null,
  add column if not exists generation_occurrence_scheduled_for timestamptz null,
  add column if not exists generation_started_at timestamptz null,
  add column if not exists generation_finished_at timestamptz null,
  add column if not exists generation_failure_code text null,
  add column if not exists generation_failure_message text null,
  add column if not exists generation_customer_message text null,
  add column if not exists generation_failure_stage text null,
  add column if not exists generation_refunded_credits integer not null default 0,
  add column if not exists generation_notification_status text null,
  add column if not exists generation_notification_sent_at timestamptz null;

alter table public.brand_profiles
  add column if not exists website_access_status text not null default 'not_checked',
  add column if not exists website_security_provider text null,
  add column if not exists website_security_confidence text null,
  add column if not exists website_access_status_code integer null,
  add column if not exists website_access_message text null,
  add column if not exists website_access_checked_at timestamptz null;

create table if not exists public.automation_occurrences (
  id uuid primary key default gen_random_uuid(),
  automation_rule_id uuid not null,
  user_id uuid not null,
  brand_profile_id uuid null,
  scheduled_for timestamptz not null,
  attempt_kind text not null default 'automatic'
    check (attempt_kind in ('automatic', 'manual')),
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed_terminal')),
  automatic_run_count integer not null default 1,
  run_log_id uuid null,
  post_id uuid null,
  worker_name text null,
  rule_name text null,
  content_type_id text null,
  content_type_label text null,
  content_format text null,
  campaign_title text null,
  started_at timestamptz not null default now(),
  finished_at timestamptz null,
  failure_code text null,
  failure_stage text null,
  failure_message_internal text null,
  failure_message_customer text null,
  refunded_credits integer not null default 0,
  notification_status text not null default 'not_applicable'
    check (notification_status in ('not_applicable', 'pending', 'sent', 'failed', 'suppressed')),
  notification_sent_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists automation_occurrences_one_automatic_attempt_idx
  on public.automation_occurrences (automation_rule_id, scheduled_for)
  where attempt_kind = 'automatic';
create index if not exists automation_occurrences_user_started_idx
  on public.automation_occurrences (user_id, started_at desc);
create index if not exists automation_occurrences_brand_started_idx
  on public.automation_occurrences (brand_profile_id, started_at desc);
create index if not exists automation_occurrences_status_started_idx
  on public.automation_occurrences (status, started_at desc);
create index if not exists automation_occurrences_refunds_idx
  on public.automation_occurrences (finished_at desc)
  where refunded_credits > 0;

alter table public.automation_occurrences enable row level security;
drop policy if exists "Users can view their own automation occurrences"
  on public.automation_occurrences;
create policy "Users can view their own automation occurrences"
  on public.automation_occurrences
  for select to authenticated
  using (auth.uid() = user_id);

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_profile_id uuid null,
  automation_rule_id uuid null,
  occurrence_id uuid null,
  notification_type text not null,
  channel text not null default 'email',
  recipient text null,
  subject text null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'suppressed')),
  error_message text null,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_notifications_occurrence_type_channel_idx
  on public.customer_notifications (occurrence_id, notification_type, channel)
  where occurrence_id is not null;
create index if not exists customer_notifications_user_created_idx
  on public.customer_notifications (user_id, created_at desc);

alter table public.customer_notifications enable row level security;
drop policy if exists "Users can view their own customer notifications"
  on public.customer_notifications;
create policy "Users can view their own customer notifications"
  on public.customer_notifications
  for select to authenticated
  using (auth.uid() = user_id);

alter table public.automation_run_logs
  add column if not exists scheduled_for timestamptz null,
  add column if not exists occurrence_id uuid null,
  add column if not exists attempt_kind text not null default 'automatic',
  add column if not exists failure_code text null,
  add column if not exists failure_customer_message text null,
  add column if not exists refunded_credits integer not null default 0,
  add column if not exists notification_status text null;

create index if not exists automation_run_logs_occurrence_idx
  on public.automation_run_logs (occurrence_id);

-- Atomically claims the only allowed automatic generation attempt for one
-- rule + scheduled occurrence. Product search may use all existing internal
-- methods inside this one claimed run.
create or replace function public.claim_automation_occurrence_once(
  p_rule_id uuid,
  p_scheduled_for timestamptz,
  p_run_log_id uuid default null,
  p_worker_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.automation_rules%rowtype;
  v_occurrence public.automation_occurrences%rowtype;
begin
  select * into v_rule
  from public.automation_rules
  where id = p_rule_id
  for update;

  if not found then
    raise exception 'Automation rule not found.';
  end if;

  select * into v_occurrence
  from public.automation_occurrences
  where automation_rule_id = p_rule_id
    and scheduled_for = p_scheduled_for
    and attempt_kind = 'automatic'
  limit 1;

  if found then
    update public.automation_occurrences
    set automatic_run_count = greatest(automatic_run_count, 1) + 1,
        updated_at = now()
    where id = v_occurrence.id;

    update public.automation_rules
    set queue_locked_until = null,
        updated_at = now()
    where id = p_rule_id;

    return jsonb_build_object(
      'claimed', false,
      'occurrence_id', v_occurrence.id,
      'status', v_occurrence.status,
      'started_at', v_occurrence.started_at
    );
  end if;

  insert into public.automation_occurrences (
    automation_rule_id,
    user_id,
    brand_profile_id,
    scheduled_for,
    attempt_kind,
    status,
    run_log_id,
    worker_name,
    rule_name,
    content_type_id,
    content_type_label,
    content_format,
    campaign_title,
    notification_status
  ) values (
    v_rule.id,
    v_rule.user_id,
    v_rule.brand_profile_id,
    p_scheduled_for,
    'automatic',
    'running',
    p_run_log_id,
    nullif(trim(coalesce(p_worker_name, '')), ''),
    v_rule.name,
    v_rule.content_type_id,
    v_rule.content_type_label,
    v_rule.content_format,
    v_rule.name,
    'not_applicable'
  )
  returning * into v_occurrence;

  update public.automation_rules
  set generation_occurrence_status = 'running',
      generation_occurrence_scheduled_for = p_scheduled_for,
      generation_started_at = v_occurrence.started_at,
      generation_finished_at = null,
      generation_failure_code = null,
      generation_failure_message = null,
      generation_customer_message = null,
      generation_failure_stage = null,
      generation_refunded_credits = 0,
      generation_notification_status = null,
      generation_notification_sent_at = null,
      updated_at = now()
  where id = p_rule_id;

  update public.automation_run_logs
  set scheduled_for = p_scheduled_for,
      occurrence_id = v_occurrence.id,
      attempt_kind = 'automatic',
      updated_at = now()
  where id = p_run_log_id;

  return jsonb_build_object(
    'claimed', true,
    'occurrence_id', v_occurrence.id,
    'status', v_occurrence.status,
    'started_at', v_occurrence.started_at
  );
end;
$$;

create or replace function public.complete_automation_occurrence(
  p_occurrence_id uuid,
  p_post_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
begin
  select * into v_occurrence
  from public.automation_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Automation occurrence not found.';
  end if;

  if v_occurrence.status = 'completed' then
    return jsonb_build_object('handled', false, 'status', 'completed');
  end if;

  if v_occurrence.status = 'failed_terminal' then
    return jsonb_build_object('handled', false, 'status', 'failed_terminal');
  end if;

  update public.automation_occurrences
  set status = 'completed',
      post_id = coalesce(p_post_id, post_id),
      finished_at = now(),
      notification_status = 'not_applicable',
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = p_occurrence_id;

  update public.automation_rules
  set generation_occurrence_status = 'completed',
      generation_finished_at = now(),
      generation_failure_code = null,
      generation_failure_message = null,
      generation_customer_message = null,
      generation_failure_stage = null,
      generation_refunded_credits = 0,
      generation_notification_status = 'not_applicable',
      generation_notification_sent_at = null,
      updated_at = now()
  where id = v_occurrence.automation_rule_id;

  return jsonb_build_object('handled', true, 'status', 'completed');
end;
$$;

-- Terminal creation failure. It is idempotent and releases an existing reserved
-- credit once. The same scheduled occurrence can never be claimed again. A
-- weekly plan may advance to its next future occurrence; actionable blockers
-- such as website security or missing credits can pause the plan.
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
  v_refund integer := 0;
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
      'refunded_credits', v_occurrence.refunded_credits,
      'notification_status', v_occurrence.notification_status
    );
  end if;

  if v_occurrence.status = 'completed' then
    return jsonb_build_object('handled', false, 'status', 'completed', 'refunded_credits', 0);
  end if;

  select * into v_rule
  from public.automation_rules
  where id = v_occurrence.automation_rule_id
  for update;

  if found and v_rule.credit_reservation_status = 'reserved' then
    v_refund := greatest(coalesce(v_rule.credit_reserved_amount, v_rule.credit_cost, 1), 1);

    update public.user_credit_balances
    set credits_remaining = credits_remaining + v_refund,
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
      'released_after_failure',
      v_refund,
      coalesce(nullif(trim(p_customer_message), ''), 'Reserved credits returned after automation failure'),
      jsonb_build_object('occurrence_id', p_occurrence_id, 'failure_code', p_failure_code)
    );

    -- A recurring plan that continues needs a new reservation for its next
    -- future occurrence. This is a separate ledger event, so the failed
    -- occurrence still has a visible and auditable refund.
    if coalesce(p_keep_rule_active, false) and p_next_run_at is not null then
      update public.user_credit_balances
      set credits_remaining = credits_remaining - v_refund,
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
        'recurring_reserved_after_failure',
        -v_refund,
        'Credits reserved for the next recurring post after the failed occurrence was refunded',
        jsonb_build_object(
          'occurrence_id', p_occurrence_id,
          'failure_code', p_failure_code,
          'next_run_at', p_next_run_at
        )
      );
    end if;
  end if;

  update public.automation_occurrences
  set status = 'failed_terminal',
      finished_at = now(),
      failure_code = nullif(trim(coalesce(p_failure_code, '')), ''),
      failure_stage = nullif(trim(coalesce(p_failure_stage, '')), ''),
      failure_message_internal = left(coalesce(p_internal_message, ''), 4000),
      failure_message_customer = left(coalesce(p_customer_message, ''), 1200),
      refunded_credits = v_refund,
      notification_status = 'pending',
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
      updated_at = now()
  where id = p_occurrence_id;

  if found then
    update public.automation_rules
    set is_active = coalesce(p_keep_rule_active, false),
        next_run_at = case when coalesce(p_keep_rule_active, false) then p_next_run_at else null end,
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
        generation_refunded_credits = v_refund,
        generation_notification_status = 'pending',
        generation_notification_sent_at = null,
        credit_reservation_status = case
          when coalesce(p_keep_rule_active, false) and p_next_run_at is not null and v_refund > 0 then 'reserved'
          when v_rule.credit_reservation_status = 'reserved' then 'released'
          else v_rule.credit_reservation_status
        end,
        credit_reserved_amount = case
          when coalesce(p_keep_rule_active, false) and p_next_run_at is not null and v_refund > 0 then v_refund
          when v_rule.credit_reservation_status = 'reserved' then 0
          else v_rule.credit_reserved_amount
        end,
        credit_reserved_at = case
          when coalesce(p_keep_rule_active, false) and p_next_run_at is not null and v_refund > 0 then now()
          else v_rule.credit_reserved_at
        end,
        credit_released_at = case
          when coalesce(p_keep_rule_active, false) and p_next_run_at is not null and v_refund > 0 then null
          when v_rule.credit_reservation_status = 'reserved' then now()
          else v_rule.credit_released_at
        end,
        updated_at = now()
    where id = v_rule.id;
  end if;

  update public.automation_run_logs
  set occurrence_id = p_occurrence_id,
      failure_code = nullif(trim(coalesce(p_failure_code, '')), ''),
      failure_customer_message = left(coalesce(p_customer_message, ''), 1200),
      refunded_credits = v_refund,
      notification_status = 'pending',
      updated_at = now()
  where id = v_occurrence.run_log_id;

  return jsonb_build_object(
    'handled', true,
    'status', 'failed_terminal',
    'refunded_credits', v_refund,
    'notification_status', 'pending',
    'plan_continues', coalesce(p_keep_rule_active, false),
    'next_run_at', case when coalesce(p_keep_rule_active, false) then p_next_run_at else null end,
    'next_credit_reserved', coalesce(p_keep_rule_active, false) and p_next_run_at is not null and v_refund > 0,
    'user_id', v_occurrence.user_id,
    'brand_profile_id', v_occurrence.brand_profile_id,
    'automation_rule_id', v_occurrence.automation_rule_id
  );
end;
$$;

create or replace function public.mark_automation_failure_notification(
  p_occurrence_id uuid,
  p_status text,
  p_recipient text default null,
  p_subject text default null,
  p_error_message text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
  v_status text := case
    when p_status in ('sent', 'failed', 'suppressed') then p_status
    else 'failed'
  end;
begin
  select * into v_occurrence
  from public.automation_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Automation occurrence not found.';
  end if;

  insert into public.customer_notifications (
    user_id,
    brand_profile_id,
    automation_rule_id,
    occurrence_id,
    notification_type,
    channel,
    recipient,
    subject,
    status,
    error_message,
    metadata,
    sent_at,
    updated_at
  ) values (
    v_occurrence.user_id,
    v_occurrence.brand_profile_id,
    v_occurrence.automation_rule_id,
    v_occurrence.id,
    'creation_failed_refunded',
    'email',
    nullif(trim(coalesce(p_recipient, '')), ''),
    nullif(trim(coalesce(p_subject, '')), ''),
    v_status,
    nullif(left(coalesce(p_error_message, ''), 2000), ''),
    coalesce(p_metadata, '{}'::jsonb),
    case when v_status = 'sent' then now() else null end,
    now()
  )
  on conflict (occurrence_id, notification_type, channel)
  where occurrence_id is not null
  do update set
    recipient = excluded.recipient,
    subject = excluded.subject,
    status = excluded.status,
    error_message = excluded.error_message,
    metadata = public.customer_notifications.metadata || excluded.metadata,
    sent_at = excluded.sent_at,
    updated_at = now();

  update public.automation_occurrences
  set notification_status = v_status,
      notification_sent_at = case when v_status = 'sent' then now() else notification_sent_at end,
      updated_at = now()
  where id = p_occurrence_id;

  update public.automation_rules
  set generation_notification_status = v_status,
      generation_notification_sent_at = case when v_status = 'sent' then now() else generation_notification_sent_at end,
      updated_at = now()
  where id = v_occurrence.automation_rule_id;

  update public.automation_run_logs
  set notification_status = v_status,
      updated_at = now()
  where id = v_occurrence.run_log_id;

  return jsonb_build_object('status', v_status);
end;
$$;

revoke all on function public.claim_automation_occurrence_once(uuid, timestamptz, uuid, text) from public, anon, authenticated;
revoke all on function public.complete_automation_occurrence(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_automation_occurrence_terminal(uuid, text, text, text, text, jsonb, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.mark_automation_failure_notification(uuid, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_automation_occurrence_once(uuid, timestamptz, uuid, text) to service_role;
grant execute on function public.complete_automation_occurrence(uuid, uuid, jsonb) to service_role;
grant execute on function public.fail_automation_occurrence_terminal(uuid, text, text, text, text, jsonb, boolean, timestamptz) to service_role;
grant execute on function public.mark_automation_failure_notification(uuid, text, text, text, text, jsonb) to service_role;

-- Conservative one-time safety cleanup before cron is re-enabled. Overdue
-- active rules are paused only when their latest run failed, a running job is
-- stale, or no run log exists but the rule still carries explicit retry/error
-- state. Future untouched rules and rules whose latest run succeeded are not
-- changed.
do $$
declare
  v_row record;
  v_amount integer;
begin
  for v_row in
    select r.*, latest.id as latest_log_id, latest.status as latest_log_status,
           latest.started_at as latest_started_at, latest.error_message as latest_error
    from public.automation_rules r
    left join lateral (
      select l.id, l.status, l.started_at, l.error_message
      from public.automation_run_logs l
      where l.rule_id = r.id
      order by l.started_at desc
      limit 1
    ) latest on true
    where r.is_active = true
      and r.next_run_at is not null
      and r.next_run_at <= now()
      and (
        latest.status = 'failed'
        or (latest.status = 'running' and latest.started_at < now() - interval '3 hours')
        or (
          latest.id is null
          and (
            nullif(trim(coalesce(r.last_error, '')), '') is not null
            or coalesce(r.product_retry_attempt, 0) > 0
            or r.retry_not_before is not null
          )
        )
      )
  loop
    v_amount := 0;
    if v_row.credit_reservation_status = 'reserved' then
      v_amount := greatest(coalesce(v_row.credit_reserved_amount, v_row.credit_cost, 1), 1);
      update public.user_credit_balances
      set credits_remaining = credits_remaining + v_amount,
          updated_at = now()
      where user_id = v_row.user_id;

      insert into public.credit_reservation_events (
        user_id, automation_rule_id, brand_profile_id, rule_name,
        content_type_id, event_type, amount, reason, metadata
      ) values (
        v_row.user_id, v_row.id, v_row.brand_profile_id, v_row.name,
        v_row.content_type_id, 'released_after_failure', v_amount,
        'Reserved credits returned while v140 safely paused an old failed automation occurrence',
        jsonb_build_object('migration', 'v140', 'run_log_id', v_row.latest_log_id)
      );
    end if;

    insert into public.automation_occurrences (
      automation_rule_id, user_id, brand_profile_id, scheduled_for,
      status, run_log_id, rule_name, content_type_id, content_type_label,
      content_format, campaign_title, started_at, finished_at,
      failure_code, failure_stage, failure_message_internal,
      failure_message_customer, refunded_credits, notification_status,
      metadata
    ) values (
      v_row.id, v_row.user_id, v_row.brand_profile_id, v_row.next_run_at,
      'failed_terminal', v_row.latest_log_id, v_row.name, v_row.content_type_id,
      v_row.content_type_label, v_row.content_format,
      v_row.name, coalesce(v_row.latest_started_at, v_row.updated_at, v_row.created_at, now()), now(),
      'legacy_failed_attempt', 'v140_migration',
      coalesce(v_row.latest_error, v_row.last_error, 'Old failed automation attempt was paused before cron was re-enabled.'),
      'The planned post could not be created. No further automatic attempts will be made until the plan is reviewed.',
      v_amount, 'suppressed', jsonb_build_object('migration', 'v140')
    )
    on conflict do nothing;

    update public.automation_rules
    set is_active = false,
        next_run_at = null,
        queue_locked_until = null,
        retry_not_before = null,
        product_retry_attempt = 0,
        product_retry_reason = null,
        generation_occurrence_status = 'failed_terminal',
        generation_occurrence_scheduled_for = v_row.next_run_at,
        generation_finished_at = now(),
        generation_failure_code = 'legacy_failed_attempt',
        generation_failure_message = coalesce(v_row.latest_error, v_row.last_error, 'Old failed automation attempt'),
        generation_customer_message = 'The planned post could not be created. No further automatic attempts will be made until the plan is reviewed.',
        generation_failure_stage = 'v140_migration',
        generation_refunded_credits = v_amount,
        generation_notification_status = 'suppressed',
        credit_reservation_status = case when v_row.credit_reservation_status = 'reserved' then 'released' else v_row.credit_reservation_status end,
        credit_reserved_amount = case when v_row.credit_reservation_status = 'reserved' then 0 else v_row.credit_reserved_amount end,
        credit_released_at = case when v_row.credit_reservation_status = 'reserved' then now() else v_row.credit_released_at end,
        updated_at = now()
    where id = v_row.id;
  end loop;
end;
$$;
