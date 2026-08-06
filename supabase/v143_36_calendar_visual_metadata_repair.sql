-- Spreelo v143.36
-- Repair the reusable calendar image library without renaming or deleting Storage objects.

alter table public.calendar_visual_assets
  add column if not exists theme_key text;

alter table public.calendar_visual_assets
  add column if not exists metadata_repaired_at timestamptz;

alter table public.calendar_visual_assets
  add column if not exists classification_status text not null default 'pending'
    check (classification_status in ('pending','classifying','ready','failed')),
  add column if not exists classification_attempts integer not null default 0,
  add column if not exists classified_by text;

alter table public.calendar_visual_requests
  add column if not exists theme_tags text[] not null default '{}';

create or replace function public.normalize_calendar_visual_theme_key(candidate text, fallback_text text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(candidate, '')) = any(array[
      'christmas','new_year','lunar_new_year','easter','halloween','black_friday',
      'cyber_monday','valentines_day','mothers_day','fathers_day','back_to_school',
      'ramadan','eid','diwali','hanukkah','gaming','sustainability','office',
      'technology','winter','summer','spring','autumn','flowers','gifts','sale',
      'health','local_event','seasonal','education','awareness','product_discovery',
      'service','food','fashion','beauty','sports','travel','family','general'
    ]) then lower(candidate)
    else public.canonical_calendar_visual_theme(concat_ws(' ', candidate, fallback_text))
  end
$$;

-- The exact campaign that requested an image is the authoritative source for
-- language-independent metadata. This repairs old Swedish/local filenames while
-- keeping every existing public image URL unchanged.
with linked_metadata as (
  select distinct on (request.asset_id)
    request.asset_id,
    coalesce(
      nullif(opportunity.visual_theme_key, ''),
      public.canonical_calendar_visual_theme(concat_ws(
        ' ', opportunity.title, opportunity.slug, opportunity.description,
        opportunity.event_type, opportunity.campaign_category,
        opportunity.image_guidance, request.prompt
      ))
    ) as theme_key,
    case
      when cardinality(opportunity.visual_theme_tags) > 0
        then opportunity.visual_theme_tags
      else array[public.canonical_calendar_visual_theme(concat_ws(
        ' ', opportunity.title, opportunity.slug, opportunity.description,
        opportunity.event_type, opportunity.campaign_category,
        opportunity.image_guidance, request.prompt
      ))]
    end as theme_tags
  from public.calendar_visual_requests request
  join public.brand_campaign_opportunities opportunity
    on opportunity.id = request.opportunity_id
  where request.asset_id is not null
  order by request.asset_id, request.updated_at desc
), normalized_linked_metadata as (
  select
    asset_id,
    public.normalize_calendar_visual_theme_key(theme_key, array_to_string(theme_tags, ' ')) as theme_key,
    array(
      select distinct tag
      from unnest(
        array[public.normalize_calendar_visual_theme_key(theme_key, array_to_string(theme_tags, ' '))] || coalesce(theme_tags, '{}')
      ) as tag
      where tag is not null and tag <> ''
      limit 10
    ) as theme_tags
  from linked_metadata
)
update public.calendar_visual_assets asset
set
  theme_key = metadata.theme_key,
  theme_tags = metadata.theme_tags,
  alt_text = case
    when asset.alt_text = '' or asset.alt_text = 'Generic campaign calendar illustration'
      then metadata.theme_key
    else asset.alt_text
  end,
  metadata_repaired_at = now(),
  classification_status = 'ready',
  classified_by = 'source_campaign',
  updated_at = now()
from normalized_linked_metadata metadata
where asset.id = metadata.asset_id
  and not asset.is_generic;

-- Older unlinked rows still receive a safe canonical key. The filename is only
-- a one-time fallback here; runtime matching never depends on the filename.
update public.calendar_visual_assets asset
set
  theme_key = public.normalize_calendar_visual_theme_key(asset.theme_key, concat_ws(
    ' ', asset.alt_text, asset.image_url, array_to_string(asset.theme_tags, ' ')
  )),
  theme_tags = array[public.normalize_calendar_visual_theme_key(asset.theme_key, concat_ws(
    ' ', asset.alt_text, asset.image_url, array_to_string(asset.theme_tags, ' ')
  ))],
  metadata_repaired_at = now(),
  classification_status = case
    when public.normalize_calendar_visual_theme_key(asset.theme_key, concat_ws(
      ' ', asset.alt_text, asset.image_url, array_to_string(asset.theme_tags, ' ')
    )) = 'general' then 'pending'
    else 'ready'
  end,
  classified_by = case
    when public.normalize_calendar_visual_theme_key(asset.theme_key, concat_ws(
      ' ', asset.alt_text, asset.image_url, array_to_string(asset.theme_tags, ' ')
    )) = 'general' then null
    else 'legacy_metadata'
  end,
  updated_at = now()
where not asset.is_generic
  and not exists (
    select 1
    from public.calendar_visual_requests request
    where request.asset_id = asset.id
      and request.opportunity_id is not null
  );

update public.calendar_visual_assets
set
  theme_key = 'general',
  theme_tags = array['general'],
  metadata_repaired_at = now(),
  classification_status = 'ready',
  classified_by = 'generic_fallback',
  updated_at = now()
where is_generic;

-- Keep requests and campaign opportunities aligned with repaired assets.
update public.calendar_visual_requests request
set
  theme_key = asset.theme_key,
  theme_tags = asset.theme_tags,
  updated_at = now()
from public.calendar_visual_assets asset
where request.asset_id = asset.id
  and not asset.is_generic;

create index if not exists calendar_visual_assets_theme_key_idx
  on public.calendar_visual_assets(theme_key);

-- Read-only service-role reports used to verify the migration. No destructive
-- cleanup is performed by this migration.
create or replace view public.calendar_visual_theme_inventory as
select
  coalesce(theme_key, 'missing') as theme_key,
  count(*)::integer as asset_count,
  sum(use_count)::integer as total_uses,
  count(*) filter (where metadata_repaired_at is not null)::integer as repaired_count,
  min(created_at) as oldest_asset,
  max(created_at) as newest_asset
from public.calendar_visual_assets
where not is_generic
group by coalesce(theme_key, 'missing');

create or replace view public.calendar_visual_library_audit as
select
  asset.id,
  asset.image_url,
  asset.alt_text,
  asset.theme_key,
  asset.theme_tags,
  asset.use_count,
  asset.metadata_repaired_at,
  asset.classification_status,
  asset.classification_attempts,
  asset.classified_by,
  case
    when asset.theme_key is null or asset.theme_key = '' then 'missing_theme'
    when asset.theme_key = 'general' or asset.classification_status <> 'ready' then 'needs_classification'
    when not exists (
      select 1 from public.calendar_visual_requests request where request.asset_id = asset.id
    ) then 'unlinked_asset'
    else 'ready'
  end as audit_status
from public.calendar_visual_assets asset
where not asset.is_generic;

revoke all on public.calendar_visual_theme_inventory from anon, authenticated;
revoke all on public.calendar_visual_library_audit from anon, authenticated;
grant select on public.calendar_visual_theme_inventory to service_role;
grant select on public.calendar_visual_library_audit to service_role;
