-- Spreelo v143.45
-- Pinterest connection reliability + long-lived OAuth token rotation.
-- Run once in Supabase SQL Editor before deploying v143.45.

begin;

-- Pinterest OAuth needs to be a first-class social_connections platform.
-- Support both text/check-constraint schemas and enum-based schemas.
do $$
declare
  platform_udt_name text;
  platform_udt_schema text;
  platform_is_enum boolean := false;
  constraint_row record;
begin
  select c.udt_name, c.udt_schema
    into platform_udt_name, platform_udt_schema
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'social_connections'
    and c.column_name = 'platform';

  if platform_udt_name is null then
    raise exception 'public.social_connections.platform was not found';
  end if;

  select exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = platform_udt_name
      and n.nspname = platform_udt_schema
      and t.typtype = 'e'
  ) into platform_is_enum;

  if platform_is_enum then
    execute format(
      'alter type %I.%I add value if not exists %L',
      platform_udt_schema,
      platform_udt_name,
      'pinterest'
    );
  else
    -- Remove the legacy platform allow-list check, regardless of its generated name.
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

    -- Include the complete channel set Spreelo has selected so the same constraint
    -- does not block the next integrations.
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

-- Persistent OAuth rotation + health metadata.
alter table public.social_connections
  add column if not exists refresh_token text,
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists last_token_refresh_at timestamptz,
  add column if not exists last_connection_check_at timestamptz,
  add column if not exists last_connection_error text,
  add column if not exists reauth_required_at timestamptz;

create index if not exists social_connections_platform_status_token_expiry_idx
  on public.social_connections (platform, status, token_expires_at);

comment on column public.social_connections.refresh_token is
  'Server-side OAuth refresh token. Never expose to browser/client code.';
comment on column public.social_connections.refresh_token_expires_at is
  'Expiration of the current provider refresh token; rotated before expiry.';
comment on column public.social_connections.last_connection_check_at is
  'Last background/provider health check completed by Spreelo.';
comment on column public.social_connections.last_connection_error is
  'Latest provider connection diagnostic for internal operations.';
comment on column public.social_connections.reauth_required_at is
  'Set only when provider authorization can no longer be refreshed automatically.';

commit;
