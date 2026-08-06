-- Spreelo v143.36.1
-- Reclassify legacy images from their pixels and campaigns from their own text.
-- This migration does not delete or rename any image.

alter table public.brand_campaign_opportunities
  add column if not exists visual_theme_classification_status text not null default 'ready'
    check (visual_theme_classification_status in ('pending','classifying','ready','failed')),
  add column if not exists visual_theme_classification_attempts integer not null default 0,
  add column if not exists visual_theme_classified_by text,
  add column if not exists visual_theme_reconciled_at timestamptz;

-- Replace the older permissive fallback. In particular, do not use patterns
-- such as t.t or v.r: they also match ordinary words in unrelated languages.
create or replace function public.canonical_calendar_visual_theme(source_text text)
returns text
language sql
immutable
as $$
  with value as (select lower(coalesce(source_text, '')) as text)
  select case
    when text ~ '(christmas|xmas|jul|julklapp|weihnacht|navidad|natal|natale|no[eë]l|joulu|kerst|boże narodzenie|giáng sinh|giang sinh)' then 'christmas'
    when text ~ '(lunar[ _-]+new[ _-]+year|chinese[ _-]+new[ _-]+year|spring[ _-]+festival)' or text ~ '(^|[^[:alnum:]_])(tết|tet)([^[:alnum:]_]|$)' then 'lunar_new_year'
    when text ~ '(new[ _-]+year|nyår|nouvel[ _-]+an|año[ _-]+nuevo|ano[ _-]+nuevo|capodanno|neujahr)' then 'new_year'
    when text ~ '(easter|påsk|paques|pâques|pascua|pasqua|ostern)' then 'easter'
    when text like '%halloween%' then 'halloween'
    when text ~ '(black[ _-]+friday|black[ _-]+week)' then 'black_friday'
    when text like '%cyber monday%' then 'cyber_monday'
    when text ~ '(valentine|alla hjärtans|san valentin)' then 'valentines_day'
    when text ~ '(mother''s day|mothers day|mors dag|muttertag)' then 'mothers_day'
    when text ~ '(father''s day|fathers day|fars dag|vatertag)' then 'fathers_day'
    when text ~ '(back[ _-]+to[ _-]+school|skolstart|schulanfang)' then 'back_to_school'
    when text ~ '(^|[^[:alnum:]_])(ramadan|ramazan)([^[:alnum:]_]|$)' then 'ramadan'
    when text ~ '(^|[^[:alnum:]_])(eid|bayram)([^[:alnum:]_]|$)' then 'eid'
    when text ~ '(^|[^[:alnum:]_])(diwali|deepavali)([^[:alnum:]_]|$)' then 'diwali'
    when text ~ '(^|[^[:alnum:]_])(hanukkah|chanukah)([^[:alnum:]_]|$)' then 'hanukkah'
    when text ~ '(gaming|e[ -]?sport|gamer|spel)' then 'gaming'
    when text ~ '(sustainab|hållbar|recycl|återvinning|miljö)' then 'sustainability'
    when text ~ '(home[ _-]+office|hemmakontor|distansarbete)' then 'office'
    when text ~ '(technology|teknik|electronics|elektronik|digital)' then 'technology'
    when text ~ '(^|[^[:alnum:]_])(winter|vinter|hiver|invierno)([^[:alnum:]_]|$)' then 'winter'
    when text ~ '(^|[^[:alnum:]_])(summer|sommar|verano|estate)([^[:alnum:]_]|$)' then 'summer'
    when text ~ '(^|[^[:alnum:]_])(spring|vår|printemps|primavera)([^[:alnum:]_]|$)' then 'spring'
    when text ~ '(^|[^[:alnum:]_])(autumn|fall season|höst|automne|otoño)([^[:alnum:]_]|$)' then 'autumn'
    when text ~ '(flower|blomm|fleur|flores)' then 'flowers'
    when text ~ '(gift|present|gåva|cadeau|regalo|geschenk)' then 'gifts'
    when text ~ '(^|[^[:alnum:]_])(sale|discount|rea|rabatt|soldes|oferta)([^[:alnum:]_]|$)' then 'sale'
    when text ~ '(health|wellness|vård|hälsa|sante|salud)' then 'health'
    else 'general'
  end
  from value
$$;

-- Every existing real image is queued exactly once for low-detail visual
-- classification. Successful rows will never be sent again.
update public.calendar_visual_assets
set
  classification_status = 'pending',
  classification_attempts = 0,
  classified_by = null,
  metadata_repaired_at = null,
  updated_at = now()
where not is_generic;

-- Campaign meaning is classified independently from campaign text. Limit the
-- repair to campaigns that participate in the reusable visual library.
update public.brand_campaign_opportunities opportunity
set
  visual_theme_classification_status = 'pending',
  visual_theme_classification_attempts = 0,
  visual_theme_classified_by = null,
  visual_theme_reconciled_at = null,
  updated_at = now()
where opportunity.visual_asset_id is not null
   or exists (
     select 1
     from public.calendar_visual_requests request
     where request.opportunity_id = opportunity.id
   );

create index if not exists brand_campaign_visual_classification_idx
  on public.brand_campaign_opportunities(visual_theme_classification_status, updated_at);

create or replace view public.calendar_visual_reclassification_progress as
select 'assets'::text as record_type, classification_status as status, count(*)::integer as record_count
from public.calendar_visual_assets
where not is_generic
group by classification_status
union all
select 'campaigns'::text, visual_theme_classification_status, count(*)::integer
from public.brand_campaign_opportunities
where visual_asset_id is not null
   or exists (select 1 from public.calendar_visual_requests request where request.opportunity_id = brand_campaign_opportunities.id)
group by visual_theme_classification_status;

revoke all on public.calendar_visual_reclassification_progress from anon, authenticated;
grant select on public.calendar_visual_reclassification_progress to service_role;
