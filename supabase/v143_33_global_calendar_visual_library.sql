-- Spreelo v143.33: language-independent campaign visuals and a hard 150-image budget.

alter table public.brand_campaign_opportunities
  add column if not exists visual_theme_key text,
  add column if not exists visual_theme_tags text[] not null default '{}';

alter table public.calendar_visual_requests
  add column if not exists theme_tags text[] not null default '{}';

alter table public.calendar_visual_assets
  add column if not exists theme_key text;

create table if not exists public.calendar_visual_generation_reservations (
  request_id uuid primary key references public.calendar_visual_requests(id) on delete cascade,
  reserved_at timestamptz not null default now()
);

alter table public.calendar_visual_generation_reservations enable row level security;
revoke all on public.calendar_visual_generation_reservations from anon, authenticated;

create or replace function public.canonical_calendar_visual_theme(source_text text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(source_text,'')) ~ '(christmas|xmas|jul|weihnacht|navidad|natal|natale|noel|joulu|kerst|gi.ng.sinh)' then 'christmas'
    when lower(coalesce(source_text,'')) ~ '(lunar.new.year|chinese.new.year|t.t|spring.festival)' then 'lunar_new_year'
    when lower(coalesce(source_text,'')) ~ '(new.year|ny.r|nouvel.an|ano.nuevo|capodanno|neujahr)' then 'new_year'
    when lower(coalesce(source_text,'')) ~ '(easter|p.sk|paques|pascua|pasqua|ostern)' then 'easter'
    when lower(coalesce(source_text,'')) like '%halloween%' then 'halloween'
    when lower(coalesce(source_text,'')) ~ '(black.friday|black.week)' then 'black_friday'
    when lower(coalesce(source_text,'')) like '%cyber monday%' then 'cyber_monday'
    when lower(coalesce(source_text,'')) ~ '(valentine|alla.hj.rtans|san.valentin)' then 'valentines_day'
    when lower(coalesce(source_text,'')) ~ '(mother.s.day|mors.dag|muttertag)' then 'mothers_day'
    when lower(coalesce(source_text,'')) ~ '(father.s.day|fars.dag|vatertag)' then 'fathers_day'
    when lower(coalesce(source_text,'')) ~ '(back.to.school|skolstart|schulanfang)' then 'back_to_school'
    when lower(coalesce(source_text,'')) ~ '(ramadan|ramazan)' then 'ramadan'
    when lower(coalesce(source_text,'')) ~ '(^|[^a-z])(eid|bayram)([^a-z]|$)' then 'eid'
    when lower(coalesce(source_text,'')) ~ '(diwali|deepavali)' then 'diwali'
    when lower(coalesce(source_text,'')) ~ '(hanukkah|chanukah)' then 'hanukkah'
    when lower(coalesce(source_text,'')) ~ '(gaming|e.sport|esport|gamer|spel)' then 'gaming'
    when lower(coalesce(source_text,'')) ~ '(sustainab|h.llbar|recycl|.tervinning|milj)' then 'sustainability'
    when lower(coalesce(source_text,'')) ~ '(home.office|office|hemmakontor|distansarbete)' then 'office'
    when lower(coalesce(source_text,'')) ~ '(technology|teknik|electronics|elektronik|digital)' then 'technology'
    when lower(coalesce(source_text,'')) ~ '(winter|vinter|hiver|invierno)' then 'winter'
    when lower(coalesce(source_text,'')) ~ '(summer|sommar|verano|estate)' then 'summer'
    when lower(coalesce(source_text,'')) ~ '(spring|v.r|printemps|primavera)' then 'spring'
    when lower(coalesce(source_text,'')) ~ '(autumn|fall.season|h.st|automne|oto.o)' then 'autumn'
    when lower(coalesce(source_text,'')) ~ '(flower|blomm|fleur|flores)' then 'flowers'
    when lower(coalesce(source_text,'')) ~ '(gift|present|g.va|cadeau|regalo|geschenk)' then 'gifts'
    when lower(coalesce(source_text,'')) ~ '(sale|discount|rea|rabatt|soldes|oferta)' then 'sale'
    when lower(coalesce(source_text,'')) ~ '(health|wellness|v.rd|h.lsa|sante|salud)' then 'health'
    else 'general'
  end
$$;

update public.brand_campaign_opportunities
set visual_theme_key = public.canonical_calendar_visual_theme(concat_ws(' ', title, slug, description, event_type, campaign_category, image_guidance)),
    visual_theme_tags = array[public.canonical_calendar_visual_theme(concat_ws(' ', title, slug, description, event_type, campaign_category, image_guidance))]
where visual_theme_key is null or visual_theme_key = '' or cardinality(visual_theme_tags) = 0;

update public.calendar_visual_requests request
set theme_key = coalesce(opportunity.visual_theme_key, public.canonical_calendar_visual_theme(concat_ws(' ', request.theme_key, request.prompt))),
    theme_tags = case when cardinality(opportunity.visual_theme_tags) > 0 then opportunity.visual_theme_tags else array[public.canonical_calendar_visual_theme(concat_ws(' ', request.theme_key, request.prompt))] end
from public.brand_campaign_opportunities opportunity
where request.opportunity_id = opportunity.id;

update public.calendar_visual_assets
set theme_key = public.canonical_calendar_visual_theme(concat_ws(' ', alt_text, array_to_string(theme_tags, ' '))),
    theme_tags = array[public.canonical_calendar_visual_theme(concat_ws(' ', alt_text, array_to_string(theme_tags, ' ')))] || coalesce(theme_tags, '{}')
where not is_generic and (theme_key is null or theme_key = '');

update public.calendar_visual_assets set theme_key = 'general', theme_tags = array['general'] where is_generic;

create index if not exists calendar_visual_assets_theme_key_idx on public.calendar_visual_assets(theme_key);
create index if not exists brand_campaign_opportunities_visual_theme_idx on public.brand_campaign_opportunities(visual_theme_key);

create or replace function public.reserve_calendar_visual_generation_capacity(request_uuid uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  asset_total integer;
  reservation_total integer;
begin
  perform pg_advisory_xact_lock(hashtext('spreelo_calendar_visual_capacity'));
  delete from public.calendar_visual_generation_reservations where reserved_at < now() - interval '30 minutes';

  if exists (select 1 from public.calendar_visual_generation_reservations where request_id = request_uuid) then
    return true;
  end if;

  select count(*) into asset_total from public.calendar_visual_assets;
  select count(*) into reservation_total from public.calendar_visual_generation_reservations;
  if asset_total + reservation_total >= 150 then return false; end if;

  insert into public.calendar_visual_generation_reservations(request_id) values (request_uuid);
  return true;
end;
$$;

revoke all on function public.reserve_calendar_visual_generation_capacity(uuid) from public, anon, authenticated;
grant execute on function public.reserve_calendar_visual_generation_capacity(uuid) to service_role;

create or replace function public.enforce_calendar_visual_asset_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('spreelo_calendar_visual_capacity'));
  if (select count(*) from public.calendar_visual_assets) >= 150 then
    raise exception 'calendar_visual_assets is limited to 150 reusable assets';
  end if;
  return new;
end;
$$;
