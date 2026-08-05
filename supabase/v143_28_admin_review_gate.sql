-- Spreelo v143.28: real admin release gate for generated posts.

create table if not exists public.spreelo_admin_settings (
  id text primary key default 'global',
  require_admin_post_approval boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint spreelo_admin_settings_singleton check (id = 'global')
);

insert into public.spreelo_admin_settings (id, require_admin_post_approval)
values ('global', false)
on conflict (id) do nothing;

alter table public.spreelo_admin_settings enable row level security;
revoke all on public.spreelo_admin_settings from anon, authenticated;

alter table public.posts
  add column if not exists admin_review_status text not null default 'not_required',
  add column if not exists admin_reviewed_at timestamptz,
  add column if not exists admin_reviewed_by uuid,
  add column if not exists admin_review_note text;

create index if not exists posts_admin_review_status_created_idx
  on public.posts(admin_review_status, created_at desc);

