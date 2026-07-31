-- v143.19 - durable brand analysis, web-research fallback and lifecycle emails
-- Run once in the Supabase SQL editor before deploying v143.19.

create extension if not exists pgcrypto;

alter table public.brand_analysis_jobs
  add column if not exists notification_locale text not null default 'en',
  add column if not exists user_message_code text not null default '',
  add column if not exists user_message text not null default '',
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists worker_name text,
  add column if not exists lease_token uuid,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists openai_response_id text,
  add column if not exists web_research_evidence text,
  add column if not exists web_research_sources jsonb not null default '[]'::jsonb,
  add column if not exists analysis_completed_email_sent_at timestamptz,
  add column if not exists analysis_completed_email_error text;

create index if not exists brand_analysis_jobs_worker_queue_idx
  on public.brand_analysis_jobs (status, next_attempt_at, created_at)
  where status in ('pending', 'running');

create index if not exists brand_analysis_jobs_stale_lease_idx
  on public.brand_analysis_jobs (lease_expires_at)
  where status = 'running';

create or replace function public.claim_brand_analysis_job(
  p_worker_name text,
  p_lease_seconds integer default 270
)
returns setof public.brand_analysis_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_now timestamptz := now();
begin
  select jobs.id
  into v_job_id
  from public.brand_analysis_jobs as jobs
  where
    (
      jobs.status = 'pending'
      and coalesce(jobs.next_attempt_at, v_now) <= v_now
    )
    or
    (
      jobs.status = 'running'
      and jobs.lease_expires_at is not null
      and jobs.lease_expires_at <= v_now
    )
  order by
    case when jobs.status = 'running' then 0 else 1 end,
    coalesce(jobs.next_attempt_at, jobs.created_at),
    jobs.created_at
  for update skip locked
  limit 1;

  if v_job_id is null then
    return;
  end if;

  return query
  update public.brand_analysis_jobs as jobs
  set
    status = 'running',
    worker_name = left(coalesce(p_worker_name, 'brand-analysis-worker'), 120),
    lease_token = gen_random_uuid(),
    lease_expires_at = v_now + make_interval(secs => greatest(60, least(coalesce(p_lease_seconds, 270), 540))),
    last_heartbeat_at = v_now,
    started_at = coalesce(jobs.started_at, v_now),
    attempt_count = jobs.attempt_count +
      case when jobs.step = 'web_research_waiting' then 0 else 1 end,
    user_message_code = case
      when jobs.status = 'running' then 'analysis_unusually_long'
      else jobs.user_message_code
    end,
    updated_at = v_now
  where jobs.id = v_job_id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_brand_analysis_job(text, integer) from public;
revoke all on function public.claim_brand_analysis_job(text, integer) from anon;
revoke all on function public.claim_brand_analysis_job(text, integer) from authenticated;
grant execute on function public.claim_brand_analysis_job(text, integer) to service_role;

create table if not exists public.user_lifecycle_emails (
  user_id uuid not null references auth.users(id) on delete cascade,
  email_type text not null,
  entity_key text not null default 'account',
  status text not null default 'pending',
  locale text not null default 'en',
  attempt_count integer not null default 0,
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, email_type, entity_key),
  constraint user_lifecycle_emails_type_check
    check (email_type in ('welcome', 'analysis_completed')),
  constraint user_lifecycle_emails_status_check
    check (status in ('pending', 'sending', 'sent', 'failed'))
);

alter table public.user_lifecycle_emails enable row level security;

revoke all on table public.user_lifecycle_emails from public;
revoke all on table public.user_lifecycle_emails from anon;
revoke all on table public.user_lifecycle_emails from authenticated;
grant all on table public.user_lifecycle_emails to service_role;

create or replace function public.claim_user_lifecycle_email(
  p_user_id uuid,
  p_email_type text,
  p_entity_key text default 'account',
  p_locale text default 'en'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer := 0;
begin
  insert into public.user_lifecycle_emails (
    user_id,
    email_type,
    entity_key,
    status,
    locale,
    attempt_count,
    locked_at,
    updated_at
  ) values (
    p_user_id,
    p_email_type,
    coalesce(nullif(p_entity_key, ''), 'account'),
    'sending',
    coalesce(nullif(p_locale, ''), 'en'),
    1,
    now(),
    now()
  )
  on conflict (user_id, email_type, entity_key) do update
  set
    status = 'sending',
    locale = excluded.locale,
    attempt_count = public.user_lifecycle_emails.attempt_count + 1,
    locked_at = now(),
    last_error = null,
    updated_at = now()
  where
    public.user_lifecycle_emails.status in ('pending', 'failed')
    or (
      public.user_lifecycle_emails.status = 'sending'
      and public.user_lifecycle_emails.locked_at < now() - interval '10 minutes'
    );

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function public.claim_user_lifecycle_email(uuid, text, text, text) from public;
revoke all on function public.claim_user_lifecycle_email(uuid, text, text, text) from anon;
revoke all on function public.claim_user_lifecycle_email(uuid, text, text, text) from authenticated;
grant execute on function public.claim_user_lifecycle_email(uuid, text, text, text) to service_role;
