-- v143.22 - durable GPT campaign research and resumable carousel integrity
-- Run once in the Supabase SQL editor before deploying v143.22.

create extension if not exists pgcrypto;

create table if not exists public.automation_campaign_research_jobs (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null references public.automation_occurrences(id) on delete cascade,
  automation_rule_id uuid not null references public.automation_rules(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  research_round integer not null default 1,
  model text not null,
  request_fingerprint text not null,
  openai_response_id text,
  status text not null default 'starting',
  output_text text,
  poll_count integer not null default 0,
  last_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automation_campaign_research_round_check
    check (research_round between 1 and 4),
  constraint automation_campaign_research_status_check
    check (status in ('starting', 'queued', 'in_progress', 'completed', 'failed')),
  constraint automation_campaign_research_occurrence_round_unique
    unique (occurrence_id, research_round)
);

create index if not exists automation_campaign_research_response_idx
  on public.automation_campaign_research_jobs (openai_response_id)
  where openai_response_id is not null;

create index if not exists automation_campaign_research_status_idx
  on public.automation_campaign_research_jobs (status, updated_at desc);

alter table public.automation_campaign_research_jobs enable row level security;

drop policy if exists automation_campaign_research_jobs_select_own
  on public.automation_campaign_research_jobs;
create policy automation_campaign_research_jobs_select_own
  on public.automation_campaign_research_jobs
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on table public.automation_campaign_research_jobs from public;
revoke all on table public.automation_campaign_research_jobs from anon;
revoke insert, update, delete on table public.automation_campaign_research_jobs from authenticated;
grant select on table public.automation_campaign_research_jobs to authenticated;
grant all on table public.automation_campaign_research_jobs to service_role;

create or replace function public.defer_automation_occurrence_for_campaign_research(
  p_occurrence_id uuid,
  p_openai_response_id text,
  p_research_round integer default 1,
  p_response_status text default 'in_progress',
  p_retry_after_ms integer default 40000,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_occurrence public.automation_occurrences%rowtype;
  v_retry_ms bigint := greatest(15000, least(120000, coalesce(p_retry_after_ms, 40000)));
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
    return jsonb_build_object('handled', false, 'status', v_occurrence.status);
  end if;

  update public.automation_occurrences
  set status = 'retry_pending',
      retry_not_before = v_retry_at,
      failure_code = null,
      failure_stage = null,
      failure_message_internal = null,
      failure_message_customer = null,
      notification_status = 'not_applicable',
      metadata = coalesce(metadata, '{}'::jsonb)
        || coalesce(p_metadata, '{}'::jsonb)
        || jsonb_build_object(
          'campaign_research_pending', true,
          'openai_response_id', nullif(trim(coalesce(p_openai_response_id, '')), ''),
          'research_round', greatest(1, coalesce(p_research_round, 1)),
          'openai_response_status', coalesce(nullif(p_response_status, ''), 'in_progress'),
          'retry_at', v_retry_at,
          'retry_after_ms', v_retry_ms
        ),
      updated_at = clock_timestamp()
  where id = p_occurrence_id;

  update public.automation_rules
  set is_active = true,
      queue_locked_until = null,
      retry_not_before = v_retry_at,
      last_error = null,
      generation_occurrence_status = 'retry_pending',
      generation_finished_at = null,
      generation_failure_code = null,
      generation_failure_message = null,
      generation_customer_message = null,
      generation_failure_stage = null,
      generation_refunded_credits = 0,
      generation_notification_status = null,
      updated_at = clock_timestamp()
  where id = v_occurrence.automation_rule_id;

  return jsonb_build_object(
    'handled', true,
    'status', 'retry_pending',
    'retry_at', v_retry_at,
    'retry_after_ms', v_retry_ms,
    'openai_response_id', nullif(trim(coalesce(p_openai_response_id, '')), ''),
    'research_round', greatest(1, coalesce(p_research_round, 1))
  );
end;
$$;

revoke all on function public.defer_automation_occurrence_for_campaign_research(uuid, text, integer, text, integer, jsonb) from public;
revoke all on function public.defer_automation_occurrence_for_campaign_research(uuid, text, integer, text, integer, jsonb) from anon;
revoke all on function public.defer_automation_occurrence_for_campaign_research(uuid, text, integer, text, integer, jsonb) from authenticated;
grant execute on function public.defer_automation_occurrence_for_campaign_research(uuid, text, integer, text, integer, jsonb) to service_role;

