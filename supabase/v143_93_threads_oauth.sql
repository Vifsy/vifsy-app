-- Spreelo v143.93
-- Ensure Threads is allowed as a first-class social_connections platform.
-- Safe to run after v143_45; supports both enum and text/check schemas.

begin;

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
      'threads'
    );
  else
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

-- Threads long-lived token health metadata. These already exist after v143_45,
-- but keeping this migration self-contained makes Threads safe to deploy independently.
alter table public.social_connections
  add column if not exists last_token_refresh_at timestamptz,
  add column if not exists last_connection_check_at timestamptz,
  add column if not exists last_connection_error text,
  add column if not exists reauth_required_at timestamptz;

commit;
