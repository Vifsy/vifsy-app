-- Spreelo v144.78
-- Growth-first package capacities and per-brand social/rolling-plan limits.
--
-- Package model:
--   Starter: 1 brand, 1 social channel per brand, 1 rolling plan per brand, 150 credits/month
--   Growth:  2 brands, 5 social channels per brand, 3 rolling plans per brand, 450 credits/month
--   Pro:     5 brands, effectively unlimited social channels per brand, 8 rolling plans per brand, 1000 credits/month
--
-- Admin bypass from v143.82 is preserved.
-- Existing credit balances are NEVER capped or reduced by this migration.

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

create or replace function public.spreelo_is_plan_limit_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    (select lower(coalesce(u.raw_app_meta_data ->> 'spreelo_admin', 'false')) = 'true'
     from auth.users u
     where u.id = p_user_id
     limit 1),
    false
  );
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
    return case v_plan
      when 'starter' then 1
      when 'growth' then 2
      when 'pro' then 5
      else 1
    end;
  elsif p_resource = 'social_accounts' then
    -- Pro is presented as unlimited. PostgreSQL integer max is used as a
    -- practical abuse-safe ceiling that no legitimate workspace can reach.
    return case v_plan
      when 'starter' then 1
      when 'growth' then 5
      when 'pro' then 2147483647
      else 0
    end;
  elsif p_resource = 'recurring_plans' then
    return case v_plan
      when 'starter' then 1
      when 'growth' then 3
      when 'pro' then 8
      else 0
    end;
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
  if public.spreelo_is_plan_limit_admin(new.user_id) then
    return new;
  end if;

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
  if public.spreelo_is_plan_limit_admin(new.user_id) then
    return new;
  end if;

  if lower(coalesce(new.status, '')) <> 'connected' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_was_connected := lower(coalesce(old.status, '')) = 'connected';
    -- A normal metadata/status-preserving update must not consume another slot.
    -- Moving an already connected account to another brand is checked against
    -- the destination brand's own capacity.
    if v_was_connected
       and old.brand_profile_id is not distinct from new.brand_profile_id then
      return new;
    end if;
  end if;

  select count(*) into v_count
  from public.social_connections
  where user_id = new.user_id
    and brand_profile_id is not distinct from new.brand_profile_id
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
before insert or update of status, brand_profile_id on public.social_connections
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
  if public.spreelo_is_plan_limit_admin(new.user_id) then
    return new;
  end if;

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
      and r.brand_profile_id is not distinct from new.brand_profile_id
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
    and r.brand_profile_id is not distinct from new.brand_profile_id
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
before insert or update of is_active, plan_state, brand_profile_id, schedule_type, queue_source on public.automation_rules
for each row execute function public.spreelo_enforce_recurring_plan_limit();

-- Update the displayed/next-refresh monthly allowance for existing paid plans.
-- credits_remaining and purchased_credits_remaining are intentionally untouched:
-- accumulated purchased credits may keep the visible balance above the plan allowance.
update public.user_credit_balances
set monthly_credit_limit = case lower(coalesce(subscription_plan, plan_name, ''))
      when 'starter' then 150
      when 'growth' then 450
      when 'pro' then 1000
      else monthly_credit_limit
    end,
    updated_at = now()
where lower(coalesce(subscription_plan, plan_name, '')) in ('starter','growth','pro')
  and monthly_credit_limit is distinct from case lower(coalesce(subscription_plan, plan_name, ''))
      when 'starter' then 150
      when 'growth' then 450
      when 'pro' then 1000
      else monthly_credit_limit
    end;

comment on function public.spreelo_entitlement_limit(uuid, text) is
  'v144.78 capacities: Starter 1 brand / 1 social per brand / 1 rolling per brand; Growth 2 / 5 / 3; Pro 5 / unlimited social / 8 rolling. Social and rolling capacities are enforced per brand.';

comment on function public.spreelo_is_plan_limit_admin(uuid) is
  'v144.78 preserves database-side plan-limit bypass for users synchronized as Spreelo admins.';
