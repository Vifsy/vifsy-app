-- Spreelo v144.109 — Rescue Center, annual calendar renewal and calendar-update emails.
-- Run once in Supabase SQL Editor before deploying v144.109.

begin;

create extension if not exists pgcrypto;

alter table public.brand_profiles
  add column if not exists calendar_generation_mode text not null default 'automatic',
  add column if not exists analysis_rescue_required boolean not null default false,
  add column if not exists last_manual_analysis_rescue_at timestamptz,
  add column if not exists last_manual_calendar_rescue_at timestamptz;

alter table public.brand_profiles
  drop constraint if exists brand_profiles_calendar_generation_mode_check;
alter table public.brand_profiles
  add constraint brand_profiles_calendar_generation_mode_check
  check (calendar_generation_mode in ('automatic','manual_rescue'));

alter table public.brand_analysis_jobs
  add column if not exists analysis_kind text not null default 'brand_analysis',
  add column if not exists target_calendar_year integer;

alter table public.brand_analysis_jobs
  drop constraint if exists brand_analysis_jobs_analysis_kind_check;
alter table public.brand_analysis_jobs
  add constraint brand_analysis_jobs_analysis_kind_check
  check (analysis_kind in ('brand_analysis','annual_calendar_refresh'));

create index if not exists brand_analysis_jobs_annual_lookup_idx
  on public.brand_analysis_jobs (brand_profile_id, analysis_kind, target_calendar_year, created_at desc);

create table if not exists public.brand_calendar_renewals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  target_year integer not null,
  mode text not null default 'automatic' check (mode in ('automatic','manual_rescue')),
  status text not null default 'pending' check (status in ('pending','queued','running','rescue_needed','rescue_imported','completed','failed')),
  analysis_job_id uuid,
  campaign_count integer not null default 0,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_profile_id, target_year)
);

create index if not exists brand_calendar_renewals_status_year_idx
  on public.brand_calendar_renewals (target_year, status, updated_at);

alter table public.brand_calendar_renewals enable row level security;
revoke all on public.brand_calendar_renewals from anon, authenticated;
grant all on public.brand_calendar_renewals to service_role;

create table if not exists public.admin_rescue_cases (
  id uuid primary key default gen_random_uuid(),
  case_type text not null check (case_type in ('brand_analysis','annual_calendar')),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand_profile_id uuid not null references public.brand_profiles(id) on delete cascade,
  source_job_id uuid,
  target_year integer not null default 0,
  status text not null default 'needed' check (status in ('needed','exported','imported','completed','dismissed','failed')),
  error_code text,
  error_message text,
  source_context jsonb not null default '{}'::jsonb,
  imported_manifest jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  imported_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_profile_id, case_type, target_year)
);

create index if not exists admin_rescue_cases_status_idx
  on public.admin_rescue_cases (status, case_type, updated_at desc);

alter table public.admin_rescue_cases enable row level security;
revoke all on public.admin_rescue_cases from anon, authenticated;
grant all on public.admin_rescue_cases to service_role;

-- Existing lifecycle email ledger can also guarantee one calendar email per brand/year.
alter table public.user_lifecycle_emails
  drop constraint if exists user_lifecycle_emails_type_check;
alter table public.user_lifecycle_emails
  add constraint user_lifecycle_emails_type_check
  check (email_type in ('welcome', 'analysis_completed', 'calendar_updated'));

commit;
