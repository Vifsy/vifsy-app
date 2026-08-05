-- Spreelo v143.30: durable admin review workbench, brand policy and calendar visuals.

update public.spreelo_admin_settings
set require_admin_post_approval = true, updated_at = now()
where id = 'global';

alter table public.brand_profiles
  add column if not exists admin_review_required boolean;

comment on column public.brand_profiles.admin_review_required is
  'NULL inherits the global setting. FALSE sends complete posts directly to the customer. Failures always require admin repair.';

alter table public.posts
  add column if not exists admin_product_items jsonb not null default '[]'::jsonb,
  add column if not exists admin_archived_at timestamptz,
  add column if not exists admin_archived_by uuid;

create index if not exists posts_admin_archived_review_idx
  on public.posts(admin_archived_at, admin_review_status, created_at desc);

create table if not exists public.admin_review_cases (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid unique,
  post_id uuid unique references public.posts(id) on delete set null,
  user_id uuid not null,
  brand_profile_id uuid,
  automation_rule_id uuid,
  status text not null default 'creating' check (status in (
    'creating', 'needs_repair', 'awaiting_spreelo', 'approved_by_spreelo',
    'sent_directly', 'customer_approved', 'changes_requested', 'archived'
  )),
  scheduled_for timestamptz,
  campaign_title text,
  content_type_label text,
  content_format text,
  draft_content text,
  product_items jsonb not null default '[]'::jsonb,
  failure_code text,
  failure_stage text,
  failure_message text,
  needs_review boolean not null default true,
  reviewed_at timestamptz,
  reviewed_by uuid,
  delivered_at timestamptz,
  digest_notified_at timestamptz,
  archived_at timestamptz,
  archived_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_review_cases_queue_idx
  on public.admin_review_cases(status, needs_review, created_at desc);
create index if not exists admin_review_cases_brand_idx
  on public.admin_review_cases(brand_profile_id, created_at desc);

alter table public.admin_review_cases enable row level security;
revoke all on public.admin_review_cases from anon, authenticated;

create table if not exists public.admin_review_digest_runs (
  hour_key timestamptz primary key,
  recipient text not null,
  awaiting_count integer not null default 0,
  repair_count integer not null default 0,
  sent_at timestamptz,
  provider_id text,
  created_at timestamptz not null default now()
);
alter table public.admin_review_digest_runs enable row level security;
revoke all on public.admin_review_digest_runs from anon, authenticated;

create table if not exists public.calendar_visual_assets (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text not null default '',
  theme_tags text[] not null default '{}',
  locale_tags text[] not null default '{}',
  is_generic boolean not null default false,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calendar_visual_assets_tags_idx
  on public.calendar_visual_assets using gin(theme_tags);
alter table public.calendar_visual_assets enable row level security;
revoke all on public.calendar_visual_assets from anon, authenticated;

insert into public.calendar_visual_assets (image_url, alt_text, theme_tags, is_generic)
select '/calendar-generic.svg', 'Generic campaign calendar illustration', array['generic'], true
where not exists (select 1 from public.calendar_visual_assets where is_generic = true);

create table if not exists public.calendar_visual_requests (
  id uuid primary key default gen_random_uuid(),
  theme_key text not null unique,
  prompt text not null,
  status text not null default 'queued' check (status in ('queued','generating','ready','failed')),
  attempt_count integer not null default 0,
  asset_id uuid references public.calendar_visual_assets(id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.calendar_visual_requests enable row level security;
revoke all on public.calendar_visual_requests from anon, authenticated;

alter table public.brand_campaign_opportunities
  add column if not exists visual_asset_id uuid references public.calendar_visual_assets(id) on delete set null,
  add column if not exists visual_image_url text;

create or replace function public.enforce_calendar_visual_asset_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.calendar_visual_assets) >= 150 then
    raise exception 'calendar_visual_assets is limited to 150 reusable assets';
  end if;
  return new;
end;
$$;

drop trigger if exists calendar_visual_assets_limit on public.calendar_visual_assets;
create trigger calendar_visual_assets_limit
before insert on public.calendar_visual_assets
for each row execute function public.enforce_calendar_visual_asset_limit();

insert into storage.buckets (id, name, public)
values ('admin-review-assets', 'admin-review-assets', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('calendar-visual-assets', 'calendar-visual-assets', true)
on conflict (id) do update set public = true;
