-- Spreelo v141: domain-safe product jobs and resumable website 429 cooldowns.
-- Run once in Supabase SQL Editor before deploying v141.

begin;

create extension if not exists pgcrypto;

alter table public.website_domain_fetch_profiles
  add column if not exists active_job_token uuid null,
  add column if not exists active_job_rule_id uuid null,
  add column if not exists active_job_worker_name text null,
  add column if not exists active_job_started_at timestamptz null,
  add column if not exists active_job_until timestamptz null;

alter table public.automation_occurrences
  add column if not exists blocked_claim_count integer not null default 0,
  add column if not exists retry_count integer not null default 0,
  add column if not exists retry_not_before timestamptz null,
  add column if not exists last_rate_limited_at timestamptz null;

alter table public.automation_occurrences
  drop constraint if exists automation_occurrences_status_check;

alter table public.automation_occurrences
  add constraint automation_occurrences_status_check
  check (status in ('running', 'retry_pending', 'completed', 'failed_terminal'));

create index if not exists website_domain_fetch_profiles_active_job_idx
  on public.website_domain_fetch_profiles (active_job_until)
  where active_job_until is not null;

create index if not exists automation_occurrences_retry_pending_idx
  on public.automation_occurrences (retry_not_before)
  where status = 'retry_pending';

create or replace function public.normalize_website_domain(p_domain text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(p_domain, ''))), '^www\.', '');
$$;

create or replace function public.acquire_website_domain_job_lock(
  p_domain text,
  p_rule_id uuid,
  p_worker_name text default null,
  p_ttl_seconds integer default 900
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := public.normalize_website_domain(p_domain);
  v_now timestamptz := clock_timestamp();
  v_profile public.website_domain_fetch_profiles%rowtype;
  v_token uuid := gen_random_uuid();
  v_ttl integer := greatest(120, least(1800, coalesce(p_ttl_seconds, 900)));
  v_wait_ms bigint := 0;
begin
  if v_domain = '' then
    return jsonb_build_object('acquired', true, 'lock_token', null, 'wait_ms', 0);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_domain));

  insert into public.website_domain_fetch_profiles (domain)
  values (v_domain)
  on conflict (domain) do nothing;

  select * into v_profile
  from public.website_domain_fetch_profiles
  where domain = v_domain
  for update;

  if v_profile.cooldown_until is not null and v_profile.cooldown_until > v_now then
    v_wait_ms := greatest(0, ceil(extract(epoch from (v_profile.cooldown_until - v_now)) * 1000));
    return jsonb_build_object(
      'acquired', false,
      'wait_ms', v_wait_ms,
      'cooldown_until', v_profile.cooldown_until,
      'active_rule_id', v_profile.active_job_rule_id,
      'active_worker_name', v_profile.active_job_worker_name
    );
  end if;

  if v_profile.active_job_until is not null
     and v_profile.active_job_until > v_now then
    v_wait_ms := greatest(0, ceil(extract(epoch from (v_profile.active_job_until - v_now)) * 1000));
    return jsonb_build_object(
      'acquired', false,
      'wait_ms', v_wait_ms,
      'active_rule_id', v_profile.active_job_rule_id,
      'active_worker_name', v_profile.active_job_worker_name,
      'active_job_until', v_profile.active_job_until
    );
  end if;

  update public.website_domain_fetch_profiles
  set active_job_token = v_token,
      active_job_rule_id = p_rule_id,
      active_job_worker_name = nullif(trim(coalesce(p_worker_name, '')), ''),
      active_job_started_at = v_now,
      active_job_until = v_now + make_interval(secs => v_ttl),
      updated_at = v_now
  where domain = v_domain;

  return jsonb_build_object(
    'acquired', true,
    'lock_token', v_token,
    'wait_ms', 0,
    'active_job_until', v_now + make_interval(secs => v_ttl)
  );
end;
$$;

create or replace function public.release_website_domain_job_lock(
  p_domain text,
  p_lock_token uuid,
  p_rule_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := public.normalize_website_domain(p_domain);
  v_released_count integer := 0;
begin
  update public.website_domain_fetch_profiles
  set active_job_token = null,
      active_job_rule_id = null,
      active_job_worker_name = null,
      active_job_started_at = null,
      active_job_until = null,
      updated_at = clock_timestamp()
  where domain = v_domain
    and active_job_token = p_lock_token
    and (p_rule_id is null or active_job_rule_id = p_rule_id);

  get diagnostics v_released_count = row_count;
  return v_released_count > 0;
end;
$$;

-- Make www.boozt.com and boozt.com share pacing/cooldown state.
create or replace function public.acquire_website_fetch_slot(
  p_domain text,
  p_requested_interval_ms integer default 950
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := public.normalize_website_domain(p_domain);
  v_now timestamptz := clock_timestamp();
  v_profile public.website_domain_fetch_profiles%rowtype;
  v_interval_ms integer := greatest(700, least(10000, coalesce(p_requested_interval_ms, 950)));
  v_wait_ms bigint := 0;
begin
  if v_domain = '' then
    return jsonb_build_object('allowed', true, 'wait_ms', 0);
  end if;

  perform pg_advisory_xact_lock(hashtext(v_domain));

  insert into public.website_domain_fetch_profiles (domain, min_interval_ms)
  values (v_domain, v_interval_ms)
  on conflict (domain) do nothing;

  select * into v_profile
  from public.website_domain_fetch_profiles
  where domain = v_domain
  for update;

  v_interval_ms := greatest(v_interval_ms, coalesce(v_profile.min_interval_ms, 950));

  if v_profile.cooldown_until is not null and v_profile.cooldown_until > v_now then
    v_wait_ms := greatest(0, ceil(extract(epoch from (v_profile.cooldown_until - v_now)) * 1000));
    return jsonb_build_object(
      'allowed', false,
      'wait_ms', v_wait_ms,
      'cooldown_until', v_profile.cooldown_until
    );
  end if;

  if v_profile.next_allowed_at is not null and v_profile.next_allowed_at > v_now then
    v_wait_ms := greatest(0, ceil(extract(epoch from (v_profile.next_allowed_at - v_now)) * 1000));
    return jsonb_build_object('allowed', false, 'wait_ms', v_wait_ms);
  end if;

  update public.website_domain_fetch_profiles
  set min_interval_ms = v_interval_ms,
      next_allowed_at = v_now + make_interval(secs => v_interval_ms::double precision / 1000.0),
      last_request_at = v_now,
      total_request_count = total_request_count + 1,
      updated_at = v_now
  where domain = v_domain;

  return jsonb_build_object('allowed', true, 'wait_ms', 0);
end;
$$;

create or replace function public.record_website_fetch_result(
  p_domain text,
  p_status integer,
  p_retry_after_ms integer default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := public.normalize_website_domain(p_domain);
  v_now timestamptz := clock_timestamp();
  v_existing_429 integer := 0;
  v_next_count integer := 0;
  v_backoff_ms bigint := 0;
begin
  if v_domain = '' then return; end if;

  insert into public.website_domain_fetch_profiles (domain)
  values (v_domain)
  on conflict (domain) do nothing;

  select consecutive_429_count into v_existing_429
  from public.website_domain_fetch_profiles
  where domain = v_domain
  for update;

  if p_status = 429 then
    v_next_count := coalesce(v_existing_429, 0) + 1;
    v_backoff_ms := greatest(
      coalesce(p_retry_after_ms, 0) + 20000,
      case
        when v_next_count = 1 then 120000
        when v_next_count = 2 then 600000
        when v_next_count = 3 then 1200000
        else 2400000
      end
    );

    update public.website_domain_fetch_profiles
    set consecutive_429_count = v_next_count,
        total_429_count = total_429_count + 1,
        cooldown_until = v_now + make_interval(secs => v_backoff_ms::double precision / 1000.0),
        next_allowed_at = v_now + make_interval(secs => v_backoff_ms::double precision / 1000.0),
        min_interval_ms = least(10000, greatest(min_interval_ms, 1500) + 750),
        last_status = p_status,
        last_rate_limited_at = v_now,
        updated_at = v_now
    where domain = v_domain;
  elsif p_status between 200 and 399 then
    update public.website_domain_fetch_profiles
    set consecutive_429_count = 0,
        cooldown_until = null,
        min_interval_ms = greatest(950, min_interval_ms - 50),
        last_status = p_status,
        last_success_at = v_now,
        updated_at = v_now
    where domain = v_domain;
  else
    update public.website_domain_fetch_profiles
    set last_status = p_status,
        updated_at = v_now
    where domain = v_domain;
  end if;
end;
$$;

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
  limit 1
  for update;

  if found then
    if v_occurrence.status = 'retry_pending'
       and (v_occurrence.retry_not_before is null or v_occurrence.retry_not_before <= now()) then
      update public.automation_occurrences
      set status = 'running',
          run_log_id = p_run_log_id,
          worker_name = nullif(trim(coalesce(p_worker_name, '')), ''),
          retry_not_before = null,
          finished_at = null,
          failure_code = null,
          failure_stage = null,
          failure_message_internal = null,
          failure_message_customer = null,
          refunded_credits = 0,
          notification_status = 'not_applicable',
          updated_at = now(),
          metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
            'resumed_after_website_rate_limit', true,
            'resumed_at', now()
          )
      where id = v_occurrence.id
      returning * into v_occurrence;

      update public.automation_rules
      set generation_occurrence_status = 'running',
          generation_started_at = coalesce(generation_started_at, now()),
          generation_finished_at = null,
          generation_failure_code = null,
          generation_failure_message = null,
          generation_customer_message = null,
          generation_failure_stage = null,
          generation_refunded_credits = 0,
          generation_notification_status = null,
          generation_notification_sent_at = null,
          retry_not_before = null,
          queue_locked_until = greatest(
            coalesce(queue_locked_until, now()),
            now() + interval '15 minutes'
          ),
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
        'resumed', true,
        'occurrence_id', v_occurrence.id,
        'status', v_occurrence.status,
        'started_at', v_occurrence.started_at,
        'retry_count', v_occurrence.retry_count
      );
    end if;

    update public.automation_occurrences
    set blocked_claim_count = blocked_claim_count + 1,
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
      'started_at', v_occurrence.started_at,
      'retry_not_before', v_occurrence.retry_not_before
    );
  end if;

  insert into public.automation_occurrences (
    automation_rule_id,
    user_id,
    brand_profile_id,
    scheduled_for,
    attempt_kind,
    status,
    automatic_run_count,
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
    1,
    p_run_log_id,
    nullif(trim(coalesce(p_worker_name, '')), ''),
    v_rule.name,
    v_rule.content_type_id,
    v_rule.content_type_label,
    v_rule.content_format,
    v_rule.name,
    'not_applicable'
  ) returning * into v_occurrence;

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
    'resumed', false,
    'occurrence_id', v_occurrence.id,
    'status', v_occurrence.status,
    'started_at', v_occurrence.started_at
  );
end;
$$;

create or replace function public.defer_automation_occurrence_for_website_rate_limit(
  p_occurrence_id uuid,
  p_domain text default null,
  p_retry_after_ms integer default 0,
  p_internal_message text default null,
  p_failure_stage text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
  v_rule public.automation_rules%rowtype;
  v_domain text := public.normalize_website_domain(p_domain);
  v_retry_ms bigint := greatest(120000, least(7200000, coalesce(p_retry_after_ms, 0) + 20000));
  v_retry_at timestamptz := clock_timestamp() + make_interval(secs => v_retry_ms::double precision / 1000.0);
  v_retry_count integer := 0;
begin
  select * into v_occurrence
  from public.automation_occurrences
  where id = p_occurrence_id
  for update;

  if not found then
    raise exception 'Automation occurrence not found.';
  end if;

  if v_occurrence.status in ('completed', 'failed_terminal') then
    return jsonb_build_object('handled', false, 'status', v_occurrence.status);
  end if;

  select * into v_rule
  from public.automation_rules
  where id = v_occurrence.automation_rule_id
  for update;

  v_retry_count := coalesce(v_occurrence.retry_count, 0) + 1;

  update public.automation_occurrences
  set status = 'retry_pending',
      retry_count = v_retry_count,
      retry_not_before = v_retry_at,
      last_rate_limited_at = clock_timestamp(),
      failure_code = 'website_rate_limited',
      failure_stage = p_failure_stage,
      failure_message_internal = p_internal_message,
      failure_message_customer = 'The website temporarily limited access. Spreelo will continue automatically after the cooldown ends.',
      notification_status = 'suppressed',
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
        'website_domain', nullif(v_domain, ''),
        'retry_at', v_retry_at,
        'retry_after_ms', v_retry_ms,
        'retry_count', v_retry_count
      ),
      updated_at = clock_timestamp()
  where id = p_occurrence_id;

  update public.automation_rules
  set is_active = true,
      queue_locked_until = null,
      retry_not_before = v_retry_at,
      product_retry_attempt = coalesce(product_retry_attempt, 0) + 1,
      product_retry_reason = p_internal_message,
      last_error = null,
      generation_occurrence_status = 'retry_pending',
      generation_finished_at = null,
      generation_failure_code = 'website_rate_limited',
      generation_failure_message = p_internal_message,
      generation_customer_message = 'Webbplatsen begränsar tillfälligt åtkomsten. Spreelo fortsätter automatiskt när väntetiden är slut.',
      generation_failure_stage = p_failure_stage,
      generation_refunded_credits = 0,
      generation_notification_status = 'suppressed',
      updated_at = clock_timestamp()
  where id = v_occurrence.automation_rule_id;

  return jsonb_build_object(
    'handled', true,
    'status', 'retry_pending',
    'retry_at', v_retry_at,
    'retry_after_ms', v_retry_ms,
    'retry_count', v_retry_count,
    'domain', nullif(v_domain, '')
  );
end;
$$;

grant execute on function public.normalize_website_domain(text) to service_role;
grant execute on function public.acquire_website_domain_job_lock(text, uuid, text, integer) to service_role;
grant execute on function public.release_website_domain_job_lock(text, uuid, uuid) to service_role;
grant execute on function public.acquire_website_fetch_slot(text, integer) to service_role;
grant execute on function public.record_website_fetch_result(text, integer, integer) to service_role;
grant execute on function public.claim_automation_occurrence_once(uuid, timestamptz, uuid, text) to service_role;
grant execute on function public.defer_automation_occurrence_for_website_rate_limit(uuid, text, integer, text, text, jsonb) to service_role;

commit;
