-- Spreelo v143.3 - isolate persistent product candidates per automation rule.
-- Run once in Supabase SQL Editor before deploying v143.3.

begin;

-- Legacy rows cannot safely be assigned to a current campaign. Removing only
-- these pending cache rows prevents them from contaminating a later campaign.
delete from public.website_product_candidate_queue
where automation_rule_id is null;

alter table public.website_product_candidate_queue
  drop constraint if exists website_product_candidate_queue_unique;

alter table public.website_product_candidate_queue
  alter column automation_rule_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'website_product_candidate_queue_rule_unique'
      and conrelid = 'public.website_product_candidate_queue'::regclass
  ) then
    alter table public.website_product_candidate_queue
      add constraint website_product_candidate_queue_rule_unique
      unique (
        brand_profile_id,
        automation_rule_id,
        canonical_product_url
      );
  end if;
end
$$;

create index if not exists website_product_candidate_queue_rule_ready_idx
  on public.website_product_candidate_queue
  (
    brand_profile_id,
    automation_rule_id,
    status,
    next_attempt_at,
    discovery_score desc
  );

commit;
