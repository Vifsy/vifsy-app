-- Spreelo v144.106: durable admin generation work queue + rescue package support.
-- Run once in Supabase SQL Editor before deploying v144.106.

begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_generation_work_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_profile_id uuid,
  automation_rule_id uuid not null,
  is_admin_test boolean not null default false,
  admin_test_batch_id uuid,
  admin_test_job_key text,
  occurrence_id uuid,
  post_id uuid,
  run_log_id uuid,
  scheduled_for timestamptz not null,
  status text not null default 'planned' check (status in ('planned','running','approval','failed','history','cancelled')),
  plan_name text,
  platform text,
  content_type_id text,
  content_type_label text,
  content_format text,
  source_url text,
  source_scope text,
  product_strategy text,
  product_match_terms jsonb,
  product_search_queries jsonb,
  requirement_count integer not null default 0,
  prompt_snapshot text,
  strategy_snapshot text,
  rule_snapshot jsonb not null default '{}'::jsonb,
  failure_code text,
  failure_stage text,
  failure_message text,
  technical_log jsonb not null default '{}'::jsonb,
  rescue_status text not null default 'none' check (rescue_status in ('none','needed','imported','ready','used')),
  rescue_data jsonb not null default '{}'::jsonb,
  rescue_imported_at timestamptz,
  rescue_imported_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admin_generation_work_items_rule_schedule_idx
  on public.admin_generation_work_items(automation_rule_id, scheduled_for);
create index if not exists admin_generation_work_items_status_schedule_idx
  on public.admin_generation_work_items(status, scheduled_for);
create index if not exists admin_generation_work_items_occurrence_idx
  on public.admin_generation_work_items(occurrence_id) where occurrence_id is not null;
create index if not exists admin_generation_work_items_post_idx
  on public.admin_generation_work_items(post_id) where post_id is not null;
create index if not exists admin_generation_work_items_brand_idx
  on public.admin_generation_work_items(brand_profile_id, scheduled_for desc);

alter table public.admin_generation_work_items enable row level security;
revoke all on public.admin_generation_work_items from anon, authenticated;

comment on table public.admin_generation_work_items is
  'Durable admin-side work order created before generation starts. It follows one planned occurrence through running, approval, failure, rescue and history.';

create or replace function public.spreelo_admin_requirement_count(p_rule jsonb)
returns integer
language sql
immutable
as $$
  select case
    when lower(coalesce(p_rule->>'content_type_id','')) = 'carousel_website_item'
      or lower(coalesce(p_rule->>'content_format','')) like '%carousel%' then 5
    when lower(coalesce(p_rule->>'content_type_id','')) in ('website_item','website_item_text_ad','animated_website_item','ai_product_video') then 1
    else 0
  end;
$$;

revoke all on function public.spreelo_admin_requirement_count(jsonb) from public, anon, authenticated;

create or replace function public.sync_admin_work_item_from_rule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb := to_jsonb(new);
  v_active boolean := coalesce((j->>'is_active')::boolean, false);
  v_next timestamptz;
  v_status text;
begin
  begin
    v_next := nullif(j->>'next_run_at','')::timestamptz;
  exception when others then
    v_next := null;
  end;

  if v_next is null then
    return new;
  end if;

  v_status := case when v_active then 'planned' else 'cancelled' end;

  insert into public.admin_generation_work_items (
    user_id, brand_profile_id, automation_rule_id, is_admin_test, admin_test_batch_id, admin_test_job_key, scheduled_for, status,
    plan_name, platform, content_type_id, content_type_label, content_format,
    source_url, source_scope, product_strategy, product_match_terms,
    product_search_queries, requirement_count, prompt_snapshot, strategy_snapshot, rule_snapshot,
    updated_at
  ) values (
    (j->>'user_id')::uuid,
    nullif(j->>'brand_profile_id','')::uuid,
    (j->>'id')::uuid,
    coalesce((j->>'is_admin_test')::boolean, false),
    nullif(j->>'admin_test_batch_id','')::uuid,
    nullif(j->>'admin_test_job_key',''),
    v_next,
    v_status,
    nullif(j->>'name',''),
    nullif(j->>'platform',''),
    nullif(j->>'content_type_id',''),
    coalesce(nullif(j->>'content_type_label',''), nullif(j->>'post_type','')),
    nullif(j->>'content_format',''),
    nullif(j->>'content_source_url',''),
    coalesce(nullif(j->>'content_source_scope',''), 'whole_website'),
    nullif(j->>'product_search_intent',''),
    case when jsonb_typeof(j->'product_match_terms') = 'array' then j->'product_match_terms' else '[]'::jsonb end,
    case when jsonb_typeof(j->'product_search_queries') = 'array' then j->'product_search_queries' else '[]'::jsonb end,
    public.spreelo_admin_requirement_count(j),
    nullif(j->>'prompt',''),
    nullif(j->>'strategy_notes',''),
    j,
    now()
  )
  on conflict (automation_rule_id, scheduled_for) do update set
    user_id = excluded.user_id,
    brand_profile_id = excluded.brand_profile_id,
    is_admin_test = excluded.is_admin_test,
    admin_test_batch_id = excluded.admin_test_batch_id,
    admin_test_job_key = excluded.admin_test_job_key,
    status = case
      when public.admin_generation_work_items.status in ('running','approval','failed','history') then public.admin_generation_work_items.status
      else excluded.status
    end,
    plan_name = excluded.plan_name,
    platform = excluded.platform,
    content_type_id = excluded.content_type_id,
    content_type_label = excluded.content_type_label,
    content_format = excluded.content_format,
    source_url = excluded.source_url,
    source_scope = excluded.source_scope,
    product_strategy = excluded.product_strategy,
    product_match_terms = excluded.product_match_terms,
    product_search_queries = excluded.product_search_queries,
    requirement_count = excluded.requirement_count,
    prompt_snapshot = excluded.prompt_snapshot,
    strategy_snapshot = excluded.strategy_snapshot,
    rule_snapshot = excluded.rule_snapshot,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists admin_generation_work_item_from_rule on public.automation_rules;
create trigger admin_generation_work_item_from_rule
after insert or update
on public.automation_rules
for each row execute function public.sync_admin_work_item_from_rule();

revoke all on function public.sync_admin_work_item_from_rule() from public, anon, authenticated;

create or replace function public.sync_admin_work_item_from_occurrence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  j jsonb := to_jsonb(new);
  v_status text := case
    when coalesce(j->>'status','') = 'failed_terminal' then 'failed'
    when coalesce(j->>'status','') = 'completed' then 'approval'
    else 'running'
  end;
  v_rule jsonb;
begin
  select to_jsonb(r) into v_rule from public.automation_rules r where r.id = new.automation_rule_id;

  insert into public.admin_generation_work_items (
    user_id, brand_profile_id, automation_rule_id, is_admin_test, admin_test_batch_id, admin_test_job_key, occurrence_id, post_id, run_log_id,
    scheduled_for, status, plan_name, platform, content_type_id, content_type_label,
    content_format, source_url, source_scope, product_strategy, product_match_terms,
    product_search_queries, requirement_count, prompt_snapshot, strategy_snapshot, rule_snapshot,
    failure_code, failure_stage, failure_message, technical_log, rescue_status, updated_at
  ) values (
    new.user_id, new.brand_profile_id, new.automation_rule_id,
    coalesce((j->>'is_admin_test')::boolean, coalesce((v_rule->>'is_admin_test')::boolean, false)),
    coalesce(nullif(j->>'admin_test_batch_id','')::uuid, nullif(v_rule->>'admin_test_batch_id','')::uuid),
    coalesce(nullif(j->>'admin_test_job_key',''), nullif(v_rule->>'admin_test_job_key','')),
    new.id, new.post_id, new.run_log_id,
    new.scheduled_for, v_status,
    coalesce(new.campaign_title, v_rule->>'name'), v_rule->>'platform',
    coalesce(new.content_type_id, v_rule->>'content_type_id'),
    coalesce(new.content_type_label, v_rule->>'content_type_label', v_rule->>'post_type'),
    coalesce(new.content_format, v_rule->>'content_format'),
    v_rule->>'content_source_url', coalesce(v_rule->>'content_source_scope','whole_website'),
    v_rule->>'product_search_intent',
    case when jsonb_typeof(v_rule->'product_match_terms')='array' then v_rule->'product_match_terms' else '[]'::jsonb end,
    case when jsonb_typeof(v_rule->'product_search_queries')='array' then v_rule->'product_search_queries' else '[]'::jsonb end,
    public.spreelo_admin_requirement_count(v_rule),
    v_rule->>'prompt', v_rule->>'strategy_notes', coalesce(v_rule, '{}'::jsonb),
    new.failure_code, new.failure_stage,
    coalesce(new.failure_message_internal, new.failure_message_customer),
    jsonb_build_object(
      'occurrence_status', new.status,
      'worker_name', new.worker_name,
      'started_at', new.started_at,
      'finished_at', new.finished_at,
      'run_log_id', new.run_log_id,
      'metadata', coalesce(new.metadata, '{}'::jsonb)
    ),
    case when v_status='failed' then 'needed' else 'none' end,
    now()
  )
  on conflict (automation_rule_id, scheduled_for) do update set
    occurrence_id = excluded.occurrence_id,
    is_admin_test = excluded.is_admin_test,
    admin_test_batch_id = excluded.admin_test_batch_id,
    admin_test_job_key = excluded.admin_test_job_key,
    post_id = coalesce(excluded.post_id, public.admin_generation_work_items.post_id),
    run_log_id = coalesce(excluded.run_log_id, public.admin_generation_work_items.run_log_id),
    status = excluded.status,
    failure_code = excluded.failure_code,
    failure_stage = excluded.failure_stage,
    failure_message = excluded.failure_message,
    rule_snapshot = case when excluded.rule_snapshot = '{}'::jsonb then public.admin_generation_work_items.rule_snapshot else excluded.rule_snapshot end,
    technical_log = public.admin_generation_work_items.technical_log || excluded.technical_log,
    rescue_status = case
      when excluded.status='failed' and public.admin_generation_work_items.rescue_status='none' then 'needed'
      else public.admin_generation_work_items.rescue_status
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists admin_generation_work_item_from_occurrence on public.automation_occurrences;
create trigger admin_generation_work_item_from_occurrence
after insert or update of status, post_id, run_log_id, failure_code, failure_stage, failure_message_internal, failure_message_customer, metadata
on public.automation_occurrences
for each row execute function public.sync_admin_work_item_from_occurrence();

revoke all on function public.sync_admin_work_item_from_occurrence() from public, anon, authenticated;

create or replace function public.sync_admin_work_item_from_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  v_status := case
    when new.status = 'failed' then 'failed'
    when new.status = 'pending_approval' then 'approval'
    when new.status in ('approved','rejected') then 'history'
    when new.status in ('creating','generating') then 'running'
    else null
  end;
  if v_status is null then return new; end if;

  update public.admin_generation_work_items
  set post_id = new.id,
      status = v_status,
      failure_message = case when v_status='failed' then coalesce(new.video_error, failure_message) else failure_message end,
      rescue_status = case when v_status='failed' and rescue_status='none' then 'needed' else rescue_status end,
      updated_at = now()
  where id = (
    select wi.id
    from public.admin_generation_work_items wi
    where wi.post_id = new.id
       or (wi.automation_rule_id = new.automation_rule_id and wi.scheduled_for = new.scheduled_for)
    order by case when wi.post_id = new.id then 0 else 1 end, wi.created_at desc
    limit 1
  );
  return new;
end;
$$;

drop trigger if exists admin_generation_work_item_from_post on public.posts;
create trigger admin_generation_work_item_from_post
after insert or update of status, scheduled_for, video_error
on public.posts
for each row execute function public.sync_admin_work_item_from_post();

revoke all on function public.sync_admin_work_item_from_post() from public, anon, authenticated;

-- Backfill the next scheduled item for every currently active rule. This is
-- deliberately only the next occurrence; recurring rules will create each new
-- future work item when next_run_at advances.
insert into public.admin_generation_work_items (
  user_id, brand_profile_id, automation_rule_id, is_admin_test, admin_test_batch_id, admin_test_job_key, scheduled_for, status,
  plan_name, platform, content_type_id, content_type_label, content_format,
  source_url, source_scope, product_strategy, product_match_terms,
  product_search_queries, requirement_count, prompt_snapshot, strategy_snapshot, rule_snapshot
)
select
  r.user_id, r.brand_profile_id, r.id, coalesce((to_jsonb(r)->>'is_admin_test')::boolean,false), nullif(to_jsonb(r)->>'admin_test_batch_id','')::uuid, to_jsonb(r)->>'admin_test_job_key', r.next_run_at, 'planned',
  to_jsonb(r)->>'name', to_jsonb(r)->>'platform', to_jsonb(r)->>'content_type_id',
  coalesce(to_jsonb(r)->>'content_type_label', to_jsonb(r)->>'post_type'), to_jsonb(r)->>'content_format',
  to_jsonb(r)->>'content_source_url', coalesce(to_jsonb(r)->>'content_source_scope','whole_website'), to_jsonb(r)->>'product_search_intent',
  case when jsonb_typeof(to_jsonb(r)->'product_match_terms')='array' then to_jsonb(r)->'product_match_terms' else '[]'::jsonb end,
  case when jsonb_typeof(to_jsonb(r)->'product_search_queries')='array' then to_jsonb(r)->'product_search_queries' else '[]'::jsonb end,
  public.spreelo_admin_requirement_count(to_jsonb(r)), to_jsonb(r)->>'prompt', to_jsonb(r)->>'strategy_notes', to_jsonb(r)
from public.automation_rules r
where r.is_active = true and r.next_run_at is not null
on conflict (automation_rule_id, scheduled_for) do nothing;

-- Backfill existing generated automation posts too. This closes the legacy
-- admin-window gap for approvals/history/failures that already existed before
-- v144.106 was installed.
insert into public.admin_generation_work_items (
  user_id, brand_profile_id, automation_rule_id, is_admin_test, admin_test_batch_id, admin_test_job_key,
  post_id, scheduled_for, status, plan_name, platform, content_type_id, content_type_label, content_format,
  source_url, source_scope, product_strategy, product_match_terms, product_search_queries, requirement_count,
  prompt_snapshot, strategy_snapshot, rule_snapshot, failure_message, technical_log, rescue_status
)
select
  p.user_id, p.brand_profile_id, p.automation_rule_id,
  coalesce((to_jsonb(p)->>'is_admin_test')::boolean, coalesce((to_jsonb(r)->>'is_admin_test')::boolean,false)),
  coalesce(nullif(to_jsonb(p)->>'admin_test_batch_id','')::uuid, nullif(to_jsonb(r)->>'admin_test_batch_id','')::uuid),
  coalesce(to_jsonb(p)->>'admin_test_job_key', to_jsonb(r)->>'admin_test_job_key'),
  p.id, coalesce(p.scheduled_for, p.created_at),
  case
    when p.status = 'failed' then 'failed'
    when p.status = 'pending_approval' then 'approval'
    when p.status in ('approved','rejected') then 'history'
    when p.status in ('creating','generating') then 'running'
    else 'history'
  end,
  to_jsonb(r)->>'name', p.platform, coalesce(to_jsonb(p)->>'content_type_id', to_jsonb(r)->>'content_type_id'),
  coalesce(to_jsonb(r)->>'content_type_label', p.post_type), coalesce(p.content_format, to_jsonb(r)->>'content_format'),
  coalesce(p.website_url, to_jsonb(r)->>'content_source_url'), coalesce(to_jsonb(r)->>'content_source_scope','whole_website'),
  to_jsonb(r)->>'product_search_intent',
  case when jsonb_typeof(to_jsonb(r)->'product_match_terms')='array' then to_jsonb(r)->'product_match_terms' else '[]'::jsonb end,
  case when jsonb_typeof(to_jsonb(r)->'product_search_queries')='array' then to_jsonb(r)->'product_search_queries' else '[]'::jsonb end,
  public.spreelo_admin_requirement_count(to_jsonb(r)), to_jsonb(r)->>'prompt', to_jsonb(r)->>'strategy_notes', coalesce(to_jsonb(r), '{}'::jsonb),
  case when p.status='failed' then p.video_error else null end,
  jsonb_build_object('post_status', p.status, 'post_id', p.id, 'backfilled_from_post', true),
  case when p.status='failed' then 'needed' else 'none' end
from public.posts p
left join public.automation_rules r on r.id = p.automation_rule_id
where p.automation_rule_id is not null
  and p.status in ('creating','generating','pending_approval','approved','rejected','failed')
on conflict (automation_rule_id, scheduled_for) do update set
  post_id = excluded.post_id,
  is_admin_test = excluded.is_admin_test,
  admin_test_batch_id = excluded.admin_test_batch_id,
  admin_test_job_key = excluded.admin_test_job_key,
  status = excluded.status,
  rule_snapshot = case when excluded.rule_snapshot = '{}'::jsonb then public.admin_generation_work_items.rule_snapshot else excluded.rule_snapshot end,
  failure_message = coalesce(excluded.failure_message, public.admin_generation_work_items.failure_message),
  technical_log = public.admin_generation_work_items.technical_log || excluded.technical_log,
  rescue_status = case
    when excluded.status='failed' and public.admin_generation_work_items.rescue_status='none' then 'needed'
    else public.admin_generation_work_items.rescue_status
  end,
  updated_at = now();

-- Give existing terminal failures a work item too, so older failures immediately
-- gain the same rescue workflow after the migration.
insert into public.admin_generation_work_items (
  user_id, brand_profile_id, automation_rule_id, is_admin_test, admin_test_batch_id, admin_test_job_key, occurrence_id, post_id, run_log_id,
  scheduled_for, status, plan_name, platform, content_type_id, content_type_label,
  content_format, source_url, source_scope, product_strategy, product_match_terms,
  product_search_queries, requirement_count, prompt_snapshot, strategy_snapshot, rule_snapshot,
  failure_code, failure_stage, failure_message, technical_log, rescue_status
)
select
  o.user_id, o.brand_profile_id, o.automation_rule_id,
  coalesce((to_jsonb(o)->>'is_admin_test')::boolean, coalesce((to_jsonb(r)->>'is_admin_test')::boolean,false)),
  coalesce(nullif(to_jsonb(o)->>'admin_test_batch_id','')::uuid, nullif(to_jsonb(r)->>'admin_test_batch_id','')::uuid),
  coalesce(to_jsonb(o)->>'admin_test_job_key', to_jsonb(r)->>'admin_test_job_key'),
  o.id, o.post_id, o.run_log_id,
  o.scheduled_for, 'failed', coalesce(o.campaign_title, to_jsonb(r)->>'name'),
  to_jsonb(r)->>'platform', coalesce(o.content_type_id, to_jsonb(r)->>'content_type_id'),
  coalesce(o.content_type_label, to_jsonb(r)->>'content_type_label', to_jsonb(r)->>'post_type'),
  coalesce(o.content_format, to_jsonb(r)->>'content_format'),
  to_jsonb(r)->>'content_source_url', coalesce(to_jsonb(r)->>'content_source_scope','whole_website'),
  to_jsonb(r)->>'product_search_intent',
  case when jsonb_typeof(to_jsonb(r)->'product_match_terms')='array' then to_jsonb(r)->'product_match_terms' else '[]'::jsonb end,
  case when jsonb_typeof(to_jsonb(r)->'product_search_queries')='array' then to_jsonb(r)->'product_search_queries' else '[]'::jsonb end,
  public.spreelo_admin_requirement_count(to_jsonb(r)), to_jsonb(r)->>'prompt', to_jsonb(r)->>'strategy_notes', coalesce(to_jsonb(r), '{}'::jsonb),
  o.failure_code, o.failure_stage, coalesce(o.failure_message_internal, o.failure_message_customer),
  jsonb_build_object(
    'occurrence_status', o.status,
    'worker_name', o.worker_name,
    'started_at', o.started_at,
    'finished_at', o.finished_at,
    'run_log_id', o.run_log_id,
    'metadata', coalesce(o.metadata, '{}'::jsonb),
    'backfilled', true
  ),
  'needed'
from public.automation_occurrences o
left join public.automation_rules r on r.id = o.automation_rule_id
where o.status = 'failed_terminal'
on conflict (automation_rule_id, scheduled_for) do update set
  occurrence_id = excluded.occurrence_id,
  post_id = coalesce(excluded.post_id, public.admin_generation_work_items.post_id),
  run_log_id = coalesce(excluded.run_log_id, public.admin_generation_work_items.run_log_id),
  status = 'failed',
  failure_code = excluded.failure_code,
  failure_stage = excluded.failure_stage,
  failure_message = excluded.failure_message,
  rule_snapshot = case when excluded.rule_snapshot = '{}'::jsonb then public.admin_generation_work_items.rule_snapshot else excluded.rule_snapshot end,
  technical_log = public.admin_generation_work_items.technical_log || excluded.technical_log,
  rescue_status = case when public.admin_generation_work_items.rescue_status='none' then 'needed' else public.admin_generation_work_items.rescue_status end,
  updated_at = now();

commit;
