-- v144: Optional Spreelo-admin quality gate for generated posts.
-- OFF is the safe default and preserves the existing customer email flow.

create table if not exists public.spreelo_admin_review_settings (
  id text primary key default 'global' check (id = 'global'),
  review_gate_enabled boolean not null default false,
  review_recipient text null,
  updated_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.spreelo_admin_review_settings (id, review_gate_enabled)
values ('global', false)
on conflict (id) do nothing;

alter table public.spreelo_admin_review_settings enable row level security;
revoke all on public.spreelo_admin_review_settings from public, anon, authenticated;
grant all on public.spreelo_admin_review_settings to service_role;

create table if not exists public.admin_post_reviews (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts(id) on delete cascade,
  previous_post_id uuid null references public.posts(id) on delete set null,
  root_post_id uuid null references public.posts(id) on delete set null,
  automation_rule_id uuid null references public.automation_rules(id) on delete set null,
  revision integer not null default 1 check (revision > 0),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'superseded')),
  requested_product_urls jsonb not null default '[]'::jsonb,
  admin_note text null,
  admin_notified_at timestamptz null,
  customer_email_released_at timestamptz null,
  reviewed_by uuid null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_post_reviews_status_created_idx
  on public.admin_post_reviews (status, created_at desc);
create index if not exists admin_post_reviews_root_revision_idx
  on public.admin_post_reviews (root_post_id, revision desc);

alter table public.admin_post_reviews enable row level security;
revoke all on public.admin_post_reviews from public, anon, authenticated;
grant all on public.admin_post_reviews to service_role;

alter table public.automation_rules
  add column if not exists admin_review_rerun_of_post_id uuid null
    references public.posts(id) on delete set null,
  add column if not exists admin_review_root_post_id uuid null
    references public.posts(id) on delete set null,
  add column if not exists admin_review_original_next_run_at timestamptz null,
  add column if not exists admin_product_override_urls jsonb not null default '[]'::jsonb,
  add column if not exists admin_review_no_charge boolean not null default false;

comment on table public.spreelo_admin_review_settings is
  'Global optional admin quality gate. Disabled preserves the normal Spreelo customer approval flow.';
comment on table public.admin_post_reviews is
  'Audit trail and revision chain for posts held for Spreelo-admin review.';
