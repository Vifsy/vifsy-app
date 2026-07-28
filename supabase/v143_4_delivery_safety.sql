-- Spreelo v143.4 - delivery-safe campaign queue migration.
-- Run once in Supabase SQL Editor before deploying v143.4.
-- This includes and hardens the v143.3 rule-scoped candidate-queue change,
-- so it is the only new SQL file required for a deployment from v143.2/143.3.

begin;

-- Legacy unscoped rows cannot safely be assigned to a current automation.
delete from public.website_product_candidate_queue
where automation_rule_id is null;

-- A previously interrupted migration or concurrent workers may have left
-- duplicate rule-scoped cache rows. Keep one before recreating the constraint.
delete from public.website_product_candidate_queue older
using public.website_product_candidate_queue keeper
where older.brand_profile_id = keeper.brand_profile_id
  and older.automation_rule_id = keeper.automation_rule_id
  and older.canonical_product_url = keeper.canonical_product_url
  and older.id > keeper.id;

alter table public.website_product_candidate_queue
  drop constraint if exists website_product_candidate_queue_unique;

alter table public.website_product_candidate_queue
  drop constraint if exists website_product_candidate_queue_rule_unique;

drop index if exists public.website_product_candidate_queue_unique;
drop index if exists public.website_product_candidate_queue_rule_unique;

alter table public.website_product_candidate_queue
  alter column automation_rule_id set not null;

alter table public.website_product_candidate_queue
  add constraint website_product_candidate_queue_rule_unique
  unique (
    brand_profile_id,
    automation_rule_id,
    canonical_product_url
  );

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
