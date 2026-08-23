-- Spreelo v144.12
-- Admin-only, provider-native generation cost tracking.
-- No FX conversion and no changes to customer-facing posts columns.

create table if not exists public.post_generation_cost_events (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  occurrence_id uuid references public.automation_occurrences(id) on delete set null,
  generation_session_id uuid,
  generation_user_id uuid,
  provider text not null,
  service text not null,
  model text,
  operation text not null,
  currency text,
  amount numeric(18,9),
  exact boolean not null default false,
  provider_request_id text,
  pricing_version text not null,
  usage_quantity numeric(24,9),
  usage_unit text,
  usage jsonb not null default '{}'::jsonb,
  note text,
  created_at timestamptz not null default now()
);

-- These columns are also added separately so the migration remains safe if an
-- early v144.12 draft of the table was already created before deployment.
alter table public.post_generation_cost_events
  add column if not exists generation_session_id uuid;
alter table public.post_generation_cost_events
  add column if not exists generation_user_id uuid;

-- PostgreSQL unique indexes allow multiple NULL provider_request_id values by
-- default. A real provider request id is therefore deduplicated, while
-- providers that do not expose one can still record separate real requests.
create unique index if not exists post_generation_cost_events_provider_request_operation_uidx
  on public.post_generation_cost_events(provider, provider_request_id, operation);
create index if not exists post_generation_cost_events_post_idx
  on public.post_generation_cost_events(post_id, created_at);
create index if not exists post_generation_cost_events_occurrence_idx
  on public.post_generation_cost_events(occurrence_id, created_at);
create index if not exists post_generation_cost_events_generation_session_idx
  on public.post_generation_cost_events(generation_session_id, created_at);

create table if not exists public.post_generation_cost_summaries (
  post_id uuid primary key references public.posts(id) on delete cascade,
  amount numeric(18,9),
  currency text,
  complete boolean not null default false,
  breakdown jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.post_generation_cost_events enable row level security;
alter table public.post_generation_cost_summaries enable row level security;

-- Internal COGS are admin/service-role data only. Keeping them outside posts
-- also means existing customer queries that select posts.* cannot expose them.
revoke all on public.post_generation_cost_events from public, anon, authenticated;
revoke all on public.post_generation_cost_summaries from public, anon, authenticated;
grant select, insert, update, delete on public.post_generation_cost_events to service_role;
grant select, insert, update, delete on public.post_generation_cost_summaries to service_role;

comment on table public.post_generation_cost_events is
  'Admin-only immutable provider-native usage/cost ledger for post generation. No FX conversion.';
comment on table public.post_generation_cost_summaries is
  'Admin-only per-post cost summary. Amount/currency are populated only when one provider billing currency can represent the full exact monetary total; breakdown always preserves native currency totals.';
