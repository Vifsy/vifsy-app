-- Spreelo v144.156 — admin system health history
-- Additive only. Does not change customer-facing tables or existing generation logic.

create table if not exists public.system_health_status (
  system_key text primary key,
  label text not null,
  status text not null default 'unknown',
  latency_ms integer,
  message text,
  details jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_failure_at timestamptz,
  consecutive_failures integer not null default 0
);

create table if not exists public.system_health_incidents (
  id uuid primary key default gen_random_uuid(),
  system_key text not null,
  label text not null,
  started_at timestamptz not null default now(),
  resolved_at timestamptz,
  duration_seconds integer,
  opening_status text not null default 'down',
  latest_status text not null default 'down',
  message text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists system_health_incidents_system_started_idx
  on public.system_health_incidents(system_key, started_at desc);
create index if not exists system_health_incidents_open_idx
  on public.system_health_incidents(system_key, resolved_at)
  where resolved_at is null;

alter table public.system_health_status enable row level security;
alter table public.system_health_incidents enable row level security;

revoke all on public.system_health_status from public, anon, authenticated;
revoke all on public.system_health_incidents from public, anon, authenticated;
grant select, insert, update, delete on public.system_health_status to service_role;
grant select, insert, update, delete on public.system_health_incidents to service_role;

comment on table public.system_health_status is
  'Admin-only current health snapshot for Spreelo dependencies. Updated by the system-health cron.';
comment on table public.system_health_incidents is
  'Admin-only incident history created when a monitored dependency changes from healthy to degraded/down and closed when it recovers.';
