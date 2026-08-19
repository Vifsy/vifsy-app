-- Spreelo v144.02 — TikTok Direct Post integration
-- Run before deploying v144.02.

begin;

-- Per-platform approval choices. TikTok requires fresh creator options,
-- a manual privacy choice, interaction choices and explicit customer consent.
alter table public.posts
  add column if not exists platform_publish_settings jsonb not null default '{}'::jsonb;

comment on column public.posts.platform_publish_settings is
  'Per-platform customer-approved publishing choices. v144.02 stores TikTok Direct Post privacy, interaction and disclosure choices here.';

-- TikTok OAuth uses a short-lived access token and a rotating long-lived refresh token.
-- These columns already exist in newer Spreelo installs, but keep this migration self-contained.
alter table public.social_connections
  add column if not exists refresh_token text,
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists last_token_refresh_at timestamptz,
  add column if not exists last_connection_check_at timestamptz,
  add column if not exists last_connection_error text,
  add column if not exists reauth_required_at timestamptz;

-- Keep the platform constraint deployment-safe for installations that predate TikTok.
do $$
declare
  constraint_row record;
begin
  if to_regclass('public.social_connections') is not null then
    for constraint_row in
      select c.conname, pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      where c.conrelid = 'public.social_connections'::regclass
        and c.contype = 'c'
    loop
      if lower(constraint_row.definition) like '%platform%'
         and lower(constraint_row.definition) like '%facebook%'
      then
        execute format(
          'alter table public.social_connections drop constraint %I',
          constraint_row.conname
        );
      end if;
    end loop;

    alter table public.social_connections
      drop constraint if exists social_connections_platform_check;

    alter table public.social_connections
      add constraint social_connections_platform_check
      check (platform in (
        'facebook',
        'instagram',
        'pinterest',
        'threads',
        'tiktok',
        'linkedin',
        'youtube',
        'snapchat',
        'weibo'
      ));
  end if;
end $$;

commit;
