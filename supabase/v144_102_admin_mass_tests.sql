-- Spreelo v144.102 - Admin mass tests
-- Run this once in Supabase SQL Editor before deploying v144.102.
-- Adds test-batch bookkeeping without changing the normal generation pipeline.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_test_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  title text null,
  status text not null default 'queued'
    check (status in ('queued','running','completed','completed_with_failures','cancelled')),
  total_jobs integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz null,
  finished_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists admin_test_batches_created_idx
  on public.admin_test_batches (created_at desc);
create index if not exists admin_test_batches_creator_idx
  on public.admin_test_batches (created_by, created_at desc);

alter table public.admin_test_batches enable row level security;
revoke all on table public.admin_test_batches from anon, authenticated;

alter table public.automation_rules
  add column if not exists is_admin_test boolean not null default false,
  add column if not exists admin_test_batch_id uuid null references public.admin_test_batches(id) on delete set null,
  add column if not exists admin_test_job_key text null,
  add column if not exists admin_test_repeat_index integer null;

create index if not exists automation_rules_admin_test_batch_idx
  on public.automation_rules (admin_test_batch_id, is_active, next_run_at);

alter table public.posts
  add column if not exists is_admin_test boolean not null default false,
  add column if not exists admin_test_batch_id uuid null references public.admin_test_batches(id) on delete set null,
  add column if not exists admin_test_job_key text null;

create index if not exists posts_admin_test_batch_idx
  on public.posts (admin_test_batch_id, created_at desc);

alter table public.automation_occurrences
  add column if not exists is_admin_test boolean not null default false,
  add column if not exists admin_test_batch_id uuid null references public.admin_test_batches(id) on delete set null,
  add column if not exists admin_test_job_key text null;

create index if not exists automation_occurrences_admin_test_batch_idx
  on public.automation_occurrences (admin_test_batch_id, started_at desc);

alter table public.automation_run_logs
  add column if not exists is_admin_test boolean not null default false,
  add column if not exists admin_test_batch_id uuid null references public.admin_test_batches(id) on delete set null,
  add column if not exists admin_test_job_key text null;

create index if not exists automation_run_logs_admin_test_batch_idx
  on public.automation_run_logs (admin_test_batch_id, started_at desc);

alter table public.admin_review_cases
  add column if not exists is_admin_test boolean not null default false,
  add column if not exists admin_test_batch_id uuid null references public.admin_test_batches(id) on delete set null,
  add column if not exists admin_test_job_key text null;

create index if not exists admin_review_cases_admin_test_batch_idx
  on public.admin_review_cases (admin_test_batch_id, updated_at desc);

alter table public.admin_runtime_incidents
  add column if not exists admin_test_batch_id uuid null references public.admin_test_batches(id) on delete set null,
  add column if not exists admin_test_job_key text null;

create or replace function public.spreelo_copy_admin_test_context_to_occurrence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.automation_rules%rowtype;
begin
  if new.automation_rule_id is null then return new; end if;
  select * into v_rule from public.automation_rules where id = new.automation_rule_id;
  if found then
    new.is_admin_test := coalesce(v_rule.is_admin_test, false);
    new.admin_test_batch_id := v_rule.admin_test_batch_id;
    new.admin_test_job_key := v_rule.admin_test_job_key;
  end if;
  return new;
end;
$$;

revoke all on function public.spreelo_copy_admin_test_context_to_occurrence() from public, anon, authenticated;
grant execute on function public.spreelo_copy_admin_test_context_to_occurrence() to service_role;

drop trigger if exists spreelo_admin_test_context_occurrence on public.automation_occurrences;
create trigger spreelo_admin_test_context_occurrence
before insert or update of automation_rule_id on public.automation_occurrences
for each row execute function public.spreelo_copy_admin_test_context_to_occurrence();

commit;
