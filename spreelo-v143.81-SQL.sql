-- Spreelo v143.81
-- Hard plan entitlements for businesses, connected social accounts and active rolling plans.
-- UI checks make these limits friendly; database triggers prevent bypass/races.

create or replace function public.spreelo_entitlement_plan(p_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when lower(coalesce(subscription_plan, plan_name, 'free')) in ('starter','growth','pro')
      then lower(coalesce(subscription_plan, plan_name, 'free'))
    else 'free'
  end
  from public.user_credit_balances
  where user_id = p_user_id
  limit 1;
$$;

create or replace function public.spreelo_entitlement_limit(p_user_id uuid, p_resource text)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text := coalesce(public.spreelo_entitlement_plan(p_user_id), 'free');
begin
  if p_resource = 'brands' then
    return case v_plan when 'pro' then 3 else 1 end;
  elsif p_resource = 'social_accounts' then
    return case v_plan when 'starter' then 1 when 'growth' then 3 when 'pro' then 10 else 0 end;
  elsif p_resource = 'recurring_plans' then
    return case v_plan when 'starter' then 1 when 'growth' then 1 when 'pro' then 3 else 0 end;
  end if;
  raise exception 'Unknown Spreelo entitlement resource: %', p_resource;
end;
$$;

create or replace function public.spreelo_enforce_brand_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := coalesce(public.spreelo_entitlement_plan(new.user_id), 'free');
  v_limit integer := public.spreelo_entitlement_limit(new.user_id, 'brands');
  v_count integer;
begin
  select count(*) into v_count
  from public.brand_profiles
  where user_id = new.user_id
    and (tg_op <> 'UPDATE' or id <> new.id);

  if v_count >= v_limit then
    raise exception 'SPREELO_PLAN_LIMIT|brands|%|%', v_limit, v_plan;
  end if;
  return new;
end;
$$;

drop trigger if exists spreelo_plan_brand_limit on public.brand_profiles;
create trigger spreelo_plan_brand_limit
before insert on public.brand_profiles
for each row execute function public.spreelo_enforce_brand_limit();

create or replace function public.spreelo_enforce_social_account_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := coalesce(public.spreelo_entitlement_plan(new.user_id), 'free');
  v_limit integer := public.spreelo_entitlement_limit(new.user_id, 'social_accounts');
  v_count integer;
  v_was_connected boolean := false;
begin
  if lower(coalesce(new.status, '')) <> 'connected' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_was_connected := lower(coalesce(old.status, '')) = 'connected';
    if v_was_connected then
      return new;
    end if;
  end if;

  select count(*) into v_count
  from public.social_connections
  where user_id = new.user_id
    and lower(coalesce(status, '')) = 'connected'
    and (tg_op <> 'UPDATE' or id <> new.id);

  if v_count >= v_limit then
    raise exception 'SPREELO_PLAN_LIMIT|social_accounts|%|%', v_limit, v_plan;
  end if;
  return new;
end;
$$;

drop trigger if exists spreelo_plan_social_account_limit on public.social_connections;
create trigger spreelo_plan_social_account_limit
before insert or update of status on public.social_connections
for each row execute function public.spreelo_enforce_social_account_limit();

create or replace function public.spreelo_enforce_recurring_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text := coalesce(public.spreelo_entitlement_plan(new.user_id), 'free');
  v_limit integer := public.spreelo_entitlement_limit(new.user_id, 'recurring_plans');
  v_group_key text;
  v_same_group_active boolean;
  v_count integer;
begin
  if lower(coalesce(new.schedule_type, '')) <> 'weekly'
     or coalesce(new.is_active, false) is not true
     or lower(coalesce(new.queue_source, 'content_studio')) = 'campaign'
     or lower(coalesce(new.plan_state, 'active')) = 'ended' then
    return new;
  end if;

  v_group_key := concat_ws('|',
    coalesce(nullif(trim(new.name), ''), nullif(trim(new.content_type_label), ''), nullif(trim(new.post_type), ''), ''),
    lower(coalesce(new.schedule_type, '')),
    lower(coalesce(nullif(trim(new.queue_source), ''), 'content_studio')),
    to_char(date_trunc('minute', coalesce(new.created_at, now())), 'YYYY-MM-DD"T"HH24:MI')
  );

  select exists (
    select 1
    from public.automation_rules r
    where r.user_id = new.user_id
      and (new.id is null or r.id <> new.id)
      and lower(coalesce(r.schedule_type, '')) = 'weekly'
      and coalesce(r.is_active, false) is true
      and lower(coalesce(r.queue_source, 'content_studio')) <> 'campaign'
      and lower(coalesce(r.plan_state, 'active')) <> 'ended'
      and concat_ws('|',
        coalesce(nullif(trim(r.name), ''), nullif(trim(r.content_type_label), ''), nullif(trim(r.post_type), ''), ''),
        lower(coalesce(r.schedule_type, '')),
        lower(coalesce(nullif(trim(r.queue_source), ''), 'content_studio')),
        to_char(date_trunc('minute', r.created_at), 'YYYY-MM-DD"T"HH24:MI')
      ) = v_group_key
  ) into v_same_group_active;

  if v_same_group_active then
    return new;
  end if;

  select count(distinct concat_ws('|',
    coalesce(nullif(trim(r.name), ''), nullif(trim(r.content_type_label), ''), nullif(trim(r.post_type), ''), ''),
    lower(coalesce(r.schedule_type, '')),
    lower(coalesce(nullif(trim(r.queue_source), ''), 'content_studio')),
    to_char(date_trunc('minute', r.created_at), 'YYYY-MM-DD"T"HH24:MI')
  )) into v_count
  from public.automation_rules r
  where r.user_id = new.user_id
    and (new.id is null or r.id <> new.id)
    and lower(coalesce(r.schedule_type, '')) = 'weekly'
    and coalesce(r.is_active, false) is true
    and lower(coalesce(r.queue_source, 'content_studio')) <> 'campaign'
    and lower(coalesce(r.plan_state, 'active')) <> 'ended';

  if v_count >= v_limit then
    raise exception 'SPREELO_PLAN_LIMIT|recurring_plans|%|%', v_limit, v_plan;
  end if;
  return new;
end;
$$;

drop trigger if exists spreelo_plan_recurring_plan_limit on public.automation_rules;
create trigger spreelo_plan_recurring_plan_limit
before insert or update of is_active, plan_state on public.automation_rules
for each row execute function public.spreelo_enforce_recurring_plan_limit();

comment on function public.spreelo_entitlement_limit(uuid, text) is
  'v143.81 plan capacities: Starter 1/1/1, Growth 1/3/1, Pro 3/10/3 for brands/social/rolling plans.';
