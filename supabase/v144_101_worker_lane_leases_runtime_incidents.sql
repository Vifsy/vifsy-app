-- Spreelo v144.101: hard worker-lane concurrency guard + durable admin runtime incidents.
-- Run once in Supabase SQL Editor before deploying v144.101.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

create table if not exists public.automation_worker_leases (
  lane_name text primary key,
  lease_token uuid null,
  acquired_at timestamptz null,
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists automation_worker_leases_expires_idx
  on public.automation_worker_leases (expires_at)
  where expires_at is not null;

alter table public.automation_worker_leases enable row level security;
revoke all on public.automation_worker_leases from anon, authenticated;

create or replace function public.acquire_automation_worker_lane(
  p_lane_name text,
  p_ttl_seconds integer default 720,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lane text := lower(trim(coalesce(p_lane_name, '')));
  v_now timestamptz := clock_timestamp();
  v_token uuid := gen_random_uuid();
  v_ttl integer := greatest(120, least(900, coalesce(p_ttl_seconds, 720)));
  v_row public.automation_worker_leases%rowtype;
begin
  if v_lane = '' then
    return jsonb_build_object('acquired', false, 'reason', 'missing_lane_name');
  end if;

  perform pg_advisory_xact_lock(hashtext('spreelo-worker-lane:' || v_lane));

  insert into public.automation_worker_leases (lane_name, metadata)
  values (v_lane, '{}'::jsonb)
  on conflict (lane_name) do nothing;

  select * into v_row
  from public.automation_worker_leases
  where lane_name = v_lane
  for update;

  if v_row.lease_token is not null
     and v_row.expires_at is not null
     and v_row.expires_at > v_now then
    return jsonb_build_object(
      'acquired', false,
      'reason', 'lane_busy',
      'acquired_at', v_row.acquired_at,
      'expires_at', v_row.expires_at,
      'active_metadata', coalesce(v_row.metadata, '{}'::jsonb)
    );
  end if;

  update public.automation_worker_leases
  set lease_token = v_token,
      acquired_at = v_now,
      expires_at = v_now + make_interval(secs => v_ttl),
      metadata = coalesce(p_metadata, '{}'::jsonb),
      updated_at = v_now
  where lane_name = v_lane;

  return jsonb_build_object(
    'acquired', true,
    'lease_token', v_token,
    'acquired_at', v_now,
    'expires_at', v_now + make_interval(secs => v_ttl),
    'metadata', coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.release_automation_worker_lane(
  p_lane_name text,
  p_lease_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lane text := lower(trim(coalesce(p_lane_name, '')));
  v_released integer := 0;
begin
  update public.automation_worker_leases
  set lease_token = null,
      acquired_at = null,
      expires_at = null,
      metadata = '{}'::jsonb,
      updated_at = clock_timestamp()
  where lane_name = v_lane
    and lease_token = p_lease_token;

  get diagnostics v_released = row_count;
  return v_released > 0;
end;
$$;

create table if not exists public.admin_runtime_incidents (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  status text not null default 'open' check (status in ('open', 'resolved')),
  severity text not null default 'error' check (severity in ('info', 'warning', 'error', 'critical')),
  kind text not null default 'runtime',
  title text null,
  failure_code text null,
  stage text null,
  message text null,
  worker_name text null,
  user_id uuid null,
  brand_profile_id uuid null,
  automation_rule_id uuid null,
  occurrence_id uuid null,
  post_id uuid null,
  run_log_id uuid null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  event_count integer not null default 1,
  last_email_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_runtime_incidents_last_seen_idx
  on public.admin_runtime_incidents (status, severity, last_seen_at desc);
create index if not exists admin_runtime_incidents_brand_idx
  on public.admin_runtime_incidents (brand_profile_id, last_seen_at desc);
create index if not exists admin_runtime_incidents_occurrence_idx
  on public.admin_runtime_incidents (occurrence_id, last_seen_at desc);

alter table public.admin_runtime_incidents enable row level security;
revoke all on public.admin_runtime_incidents from anon, authenticated;

create or replace function public.record_admin_runtime_incident(
  p_dedupe_key text,
  p_severity text default 'error',
  p_kind text default 'runtime',
  p_title text default null,
  p_failure_code text default null,
  p_stage text default null,
  p_message text default null,
  p_worker_name text default null,
  p_user_id uuid default null,
  p_brand_profile_id uuid default null,
  p_automation_rule_id uuid default null,
  p_occurrence_id uuid default null,
  p_post_id uuid default null,
  p_run_log_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_email_cooldown_seconds integer default 600
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := left(trim(coalesce(p_dedupe_key, '')), 500);
  v_now timestamptz := clock_timestamp();
  v_row public.admin_runtime_incidents%rowtype;
  v_should_email boolean := false;
  v_cooldown integer := greatest(60, least(86400, coalesce(p_email_cooldown_seconds, 600)));
  v_severity text := case when lower(coalesce(p_severity, '')) in ('info','warning','error','critical') then lower(p_severity) else 'error' end;
begin
  if v_key = '' then
    v_key := 'runtime:' || gen_random_uuid()::text;
  end if;

  perform pg_advisory_xact_lock(hashtext('spreelo-admin-incident:' || v_key));

  select * into v_row
  from public.admin_runtime_incidents
  where dedupe_key = v_key
  for update;

  if not found then
    insert into public.admin_runtime_incidents (
      dedupe_key, severity, kind, title, failure_code, stage, message,
      worker_name, user_id, brand_profile_id, automation_rule_id,
      occurrence_id, post_id, run_log_id, first_seen_at, last_seen_at,
      event_count, last_email_at, metadata, created_at, updated_at
    ) values (
      v_key, v_severity, coalesce(nullif(trim(p_kind), ''), 'runtime'), p_title,
      p_failure_code, p_stage, p_message, p_worker_name, p_user_id,
      p_brand_profile_id, p_automation_rule_id, p_occurrence_id, p_post_id,
      p_run_log_id, v_now, v_now, 1, v_now, coalesce(p_metadata, '{}'::jsonb),
      v_now, v_now
    ) returning * into v_row;
    v_should_email := true;
  else
    v_should_email := v_row.last_email_at is null
      or v_row.last_email_at <= v_now - make_interval(secs => v_cooldown);

    update public.admin_runtime_incidents
    set status = 'open',
        severity = v_severity,
        kind = coalesce(nullif(trim(p_kind), ''), kind),
        title = coalesce(p_title, title),
        failure_code = coalesce(p_failure_code, failure_code),
        stage = coalesce(p_stage, stage),
        message = coalesce(p_message, message),
        worker_name = coalesce(p_worker_name, worker_name),
        user_id = coalesce(p_user_id, user_id),
        brand_profile_id = coalesce(p_brand_profile_id, brand_profile_id),
        automation_rule_id = coalesce(p_automation_rule_id, automation_rule_id),
        occurrence_id = coalesce(p_occurrence_id, occurrence_id),
        post_id = coalesce(p_post_id, post_id),
        run_log_id = coalesce(p_run_log_id, run_log_id),
        last_seen_at = v_now,
        event_count = event_count + 1,
        last_email_at = case when v_should_email then v_now else last_email_at end,
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
        updated_at = v_now
    where id = v_row.id
    returning * into v_row;
  end if;

  return jsonb_build_object(
    'incident_id', v_row.id,
    'event_count', v_row.event_count,
    'should_email', v_should_email,
    'first_seen_at', v_row.first_seen_at,
    'last_seen_at', v_row.last_seen_at,
    'last_email_at', v_row.last_email_at
  );
end;
$$;

grant execute on function public.acquire_automation_worker_lane(text, integer, jsonb) to service_role;
grant execute on function public.release_automation_worker_lane(text, uuid) to service_role;
grant execute on function public.record_admin_runtime_incident(text, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, uuid, uuid, jsonb, integer) to service_role;

comment on table public.automation_worker_leases is
  'One expiring lease per smart-queue lane. Prevents a new cron invocation from starting generation while the same lane is still active.';
comment on table public.admin_runtime_incidents is
  'Durable admin-only runtime incident history with email deduplication metadata.';

commit;
