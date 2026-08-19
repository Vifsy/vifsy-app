-- Spreelo v144.01: admin review workbench, per-brand delivery policy and version history.
-- Run once in Supabase SQL Editor before deploying v144.01.

begin;

-- Restore the intended three-state policy:
-- NULL = inherit global, TRUE = require Spreelo admin review, FALSE = send successful posts directly.
alter table public.brand_profiles
  alter column admin_review_required drop default;

-- Keep existing explicit values intact. v144.01 only restores the ability for
-- future/new rows to inherit the global policy via NULL and for admin to save
-- TRUE/FALSE again. Existing brands can be switched individually from Admin.

comment on column public.brand_profiles.admin_review_required is
  'NULL inherits the global Spreelo review setting. TRUE requires admin review. FALSE sends successful posts directly to the customer. Failed/incomplete generations always require admin repair.';

create table if not exists public.admin_post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  version_number integer not null,
  reason text not null default 'admin_snapshot',
  content text,
  image_url text,
  video_url text,
  content_format text,
  website_url text,
  product_items jsonb not null default '[]'::jsonb,
  slides jsonb not null default '[]'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique(post_id, version_number)
);

create index if not exists admin_post_versions_post_idx
  on public.admin_post_versions(post_id, version_number desc);

alter table public.admin_post_versions enable row level security;
revoke all on public.admin_post_versions from anon, authenticated;
grant all on public.admin_post_versions to service_role;

commit;
