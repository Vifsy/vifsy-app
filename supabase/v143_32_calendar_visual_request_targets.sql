alter table public.calendar_visual_requests
  add column if not exists opportunity_id uuid references public.brand_campaign_opportunities(id) on delete cascade;

alter table public.calendar_visual_requests
  drop constraint if exists calendar_visual_requests_theme_key_key;

create index if not exists calendar_visual_requests_theme_key_idx
  on public.calendar_visual_requests(theme_key);

create unique index if not exists calendar_visual_requests_opportunity_id_uidx
  on public.calendar_visual_requests(opportunity_id);

-- Older queued requests predate exact campaign targeting. They are safe to
-- discard because the next brand analysis creates one durable request per
-- concrete campaign opportunity.
delete from public.calendar_visual_requests where opportunity_id is null;

insert into public.calendar_visual_requests (
  opportunity_id,
  theme_key,
  prompt,
  status,
  updated_at
)
select
  opportunity.id,
  left(trim(both '-' from regexp_replace(lower(coalesce(opportunity.slug, opportunity.title, 'campaign')), '[^a-z0-9]+', '-', 'g')), 120),
  'Create a unique polished 1:1 campaign-calendar illustration specifically for "' || opportunity.title || '". Campaign category: ' || coalesce(opportunity.campaign_category, opportunity.event_type, 'campaign') || '. Visual direction: ' || coalesce(opportunity.image_guidance, opportunity.description, 'represent the campaign theme clearly') || '. Use one instantly recognizable central object or scene that distinguishes this campaign from other calendar entries. Soft dimensional editorial illustration, refined pastel gradient tile, premium SaaS design, no text, no letters, no logo, no generic calendar icon.',
  'queued',
  now()
from public.brand_campaign_opportunities opportunity
where opportunity.is_active = true
  and opportunity.is_archived = false
  and (
    opportunity.visual_asset_id is null
    or opportunity.visual_image_url is null
    or opportunity.visual_image_url like '%calendar-generic.svg'
  )
on conflict (opportunity_id) do nothing;
