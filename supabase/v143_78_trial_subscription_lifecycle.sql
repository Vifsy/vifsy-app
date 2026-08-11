-- Spreelo v143.78: trials, free fallback, plan changes and trial-abuse protection.
-- Run after v143.77. Idempotent where practical.

create extension if not exists pgcrypto;

alter table public.user_credit_balances
  add column if not exists trial_start timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists pending_subscription_plan text,
  add column if not exists pending_subscription_lookup_key text,
  add column if not exists pending_subscription_effective_at timestamptz,
  add column if not exists provider_subscription_schedule_id text;

-- New accounts start as a real Free workspace with no promotional credits.
-- Trial credits are granted only after Stripe creates an approved 14-day trial,
-- which prevents account recreation from receiving a fresh balance by itself.
create or replace function public.initialize_new_credit_balance_free_v14378()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(trim(coalesce(new.provider_subscription_id,'')),'') is null then
    new.credits_remaining := 0;
    new.monthly_credit_limit := 0;
    new.plan_name := 'Free';
    new.subscription_plan := 'free';
    new.subscription_status := 'free';
    new.purchased_credits_remaining := 0;
    new.cancel_at_period_end := false;
  end if;
  return new;
end;
$$;

drop trigger if exists user_credit_balances_free_default_v14378 on public.user_credit_balances;
create trigger user_credit_balances_free_default_v14378
before insert on public.user_credit_balances
for each row execute function public.initialize_new_credit_balance_free_v14378();

create table if not exists public.trial_business_claims (
  id uuid primary key default gen_random_uuid(),
  domain_key text not null unique,
  business_name_key text,
  user_id uuid,
  brand_profile_id uuid,
  status text not null default 'pending' check (status in ('pending','active','consumed')),
  pending_expires_at timestamptz,
  trial_started_at timestamptz,
  trial_ended_at timestamptz,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists trial_business_claims_user_idx on public.trial_business_claims(user_id);
create unique index if not exists trial_business_claims_user_unique_idx on public.trial_business_claims(user_id) where user_id is not null;
alter table public.trial_business_claims enable row level security;
revoke all on public.trial_business_claims from public, anon, authenticated;

create table if not exists public.stripe_plan_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  subscription_id text not null,
  schedule_id text,
  old_lookup_key text,
  target_lookup_key text not null,
  change_type text not null,
  credit_mode text not null default 'none' check (credit_mode in ('none','delta','full')),
  credit_amount integer not null default 0,
  target_monthly_credits integer not null default 0,
  status text not null default 'pending' check (status in ('pending','scheduled','completed','failed','canceled')),
  effective_at timestamptz,
  invoice_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stripe_plan_changes_subscription_idx on public.stripe_plan_changes(subscription_id, created_at desc);
create index if not exists stripe_plan_changes_user_idx on public.stripe_plan_changes(user_id, created_at desc);
alter table public.stripe_plan_changes enable row level security;
revoke all on public.stripe_plan_changes from public, anon, authenticated;

create or replace function public.claim_spreelo_trial_business(
  p_user_id uuid,
  p_domain_key text,
  p_business_name_key text,
  p_brand_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(trim(coalesce(p_domain_key, '')));
  v_row public.trial_business_claims%rowtype;
begin
  if p_user_id is null then raise exception 'User id is required.'; end if;
  if v_domain = '' then
    return jsonb_build_object('eligible', false, 'reason', 'website_required');
  end if;

  if exists(select 1 from public.trial_business_claims where user_id=p_user_id and status in ('active','consumed')) then
    return jsonb_build_object('eligible', false, 'reason', 'account_already_trialed', 'domain', v_domain);
  end if;

  -- A single account may only have one live pending trial reservation. This
  -- prevents opening several Checkout Sessions for different domains and then
  -- completing multiple free trials in parallel. Expired reservations are safe
  -- to discard because no trial was activated.
  if exists(
    select 1 from public.trial_business_claims
    where user_id=p_user_id and status='pending'
      and (pending_expires_at is null or pending_expires_at > now())
      and domain_key <> v_domain
  ) then
    return jsonb_build_object('eligible', false, 'reason', 'account_trial_pending', 'domain', v_domain);
  end if;

  delete from public.trial_business_claims
  where user_id=p_user_id and status='pending'
    and pending_expires_at is not null and pending_expires_at <= now()
    and domain_key <> v_domain;

  select * into v_row from public.trial_business_claims where domain_key = v_domain for update;

  if not found then
    insert into public.trial_business_claims(
      domain_key, business_name_key, user_id, brand_profile_id, status, pending_expires_at
    ) values (
      v_domain, nullif(trim(coalesce(p_business_name_key,'')),''), p_user_id, p_brand_profile_id,
      'pending', now() + interval '2 hours'
    );
    return jsonb_build_object('eligible', true, 'reason', 'claimed', 'domain', v_domain);
  end if;

  if v_row.status = 'pending' and (v_row.pending_expires_at is null or v_row.pending_expires_at <= now()) then
    update public.trial_business_claims
      set user_id = p_user_id,
          brand_profile_id = p_brand_profile_id,
          business_name_key = nullif(trim(coalesce(p_business_name_key,'')),''),
          pending_expires_at = now() + interval '2 hours',
          updated_at = now()
    where id = v_row.id;
    return jsonb_build_object('eligible', true, 'reason', 'reclaimed', 'domain', v_domain);
  end if;

  if v_row.user_id = p_user_id and v_row.status = 'pending' then
    update public.trial_business_claims
      set pending_expires_at = now() + interval '2 hours', updated_at = now()
    where id = v_row.id;
    return jsonb_build_object('eligible', true, 'reason', 'same_account_pending', 'domain', v_domain);
  end if;

  return jsonb_build_object('eligible', false, 'reason', 'business_already_trialed', 'domain', v_domain);
end;
$$;

create or replace function public.mark_spreelo_trial_business(
  p_user_id uuid,
  p_domain_key text,
  p_status text,
  p_customer_id text,
  p_subscription_id text,
  p_trial_start timestamptz,
  p_trial_end timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_domain text := lower(trim(coalesce(p_domain_key,'')));
  v_status text := lower(trim(coalesce(p_status,'')));
begin
  if v_domain = '' or v_status not in ('active','consumed') then return; end if;
  update public.trial_business_claims
  set status = v_status,
      user_id = coalesce(user_id, p_user_id),
      provider_customer_id = coalesce(nullif(trim(coalesce(p_customer_id,'')),''), provider_customer_id),
      provider_subscription_id = coalesce(nullif(trim(coalesce(p_subscription_id,'')),''), provider_subscription_id),
      trial_started_at = coalesce(trial_started_at, p_trial_start, now()),
      trial_ended_at = case when v_status = 'consumed' then coalesce(p_trial_end, trial_ended_at, now()) else trial_ended_at end,
      pending_expires_at = null,
      updated_at = now()
  where domain_key = v_domain;
end;
$$;

create or replace function public.apply_stripe_subscription_state_v14378(
  p_user_id uuid,
  p_plan text,
  p_monthly_credits integer,
  p_status text,
  p_customer_id text,
  p_subscription_id text,
  p_lookup_key text,
  p_interval text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean,
  p_price_amount bigint,
  p_currency text,
  p_grant_credits boolean,
  p_source_id text,
  p_next_credit_refresh_at timestamptz,
  p_is_trial boolean,
  p_trial_credits integer,
  p_trial_start timestamptz,
  p_trial_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance public.user_credit_balances%rowtype;
  v_before integer;
  v_after integer;
  v_purchased integer;
  v_existing public.stripe_credit_grants%rowtype;
  v_should_grant boolean := coalesce(p_grant_credits, false);
  v_status text := lower(coalesce(p_status,'active'));
  v_trial boolean := coalesce(p_is_trial,false) and v_status = 'trialing';
  v_terminal boolean := v_status in ('canceled','cancelled','incomplete_expired','expired');
  v_trial_source text;
  v_release_total integer := 0;
  v_rule record;
begin
  if p_user_id is null then raise exception 'User id is required.'; end if;
  if p_interval not in ('month','year') then raise exception 'Unsupported subscription interval.'; end if;

  select * into v_balance from public.user_credit_balances where user_id = p_user_id for update;
  if not found then raise exception 'No credit balance found for this Spreelo account.'; end if;

  v_before := greatest(coalesce(v_balance.credits_remaining,0),0);

  if v_terminal then
    -- Free accounts keep purchased credits, but recurring schedules are paused.
    -- Return any still-reserved recurring credits before separating purchased
    -- credits from expiring subscription credits, otherwise a reservation could
    -- accidentally make paid top-up credits disappear at cancellation.
    select coalesce(sum(case
      when credit_reservation_status = 'reserved'
      then greatest(coalesce(credit_reserved_amount, credit_cost, 1), 1)
      else 0
    end), 0)
    into v_release_total
    from public.automation_rules
    where user_id = p_user_id
      and schedule_type = 'weekly'
      and coalesce(plan_state, 'active') <> 'ended';

    if v_release_total > 0 then
      v_before := v_before + v_release_total;

      for v_rule in
        select id, brand_profile_id, name, content_type_id,
               greatest(coalesce(credit_reserved_amount, credit_cost, 1), 1) as amount
        from public.automation_rules
        where user_id = p_user_id
          and schedule_type = 'weekly'
          and coalesce(plan_state, 'active') <> 'ended'
          and credit_reservation_status = 'reserved'
      loop
        insert into public.credit_reservation_events (
          user_id, automation_rule_id, brand_profile_id, rule_name, content_type_id, event_type, amount, reason
        ) values (
          p_user_id, v_rule.id, v_rule.brand_profile_id, v_rule.name, v_rule.content_type_id,
          'released', v_rule.amount, 'Recurring schedule paused because the paid subscription ended'
        );
      end loop;
    end if;

    update public.automation_rules
    set is_active = false,
        plan_state = case when coalesce(plan_state, 'active') = 'ended' then plan_state else 'paused' end,
        credit_reservation_status = case when credit_reservation_status = 'reserved' then 'released' else credit_reservation_status end,
        credit_reserved_amount = case when credit_reservation_status = 'reserved' then 0 else credit_reserved_amount end,
        credit_released_at = case when credit_reservation_status = 'reserved' then now() else credit_released_at end,
        queue_locked_until = null,
        retry_not_before = null,
        updated_at = now()
    where user_id = p_user_id
      and schedule_type = 'weekly'
      and coalesce(plan_state, 'active') <> 'ended';

    v_purchased := least(greatest(coalesce(v_balance.purchased_credits_remaining,0),0), v_before);
    v_after := v_purchased;
    update public.user_credit_balances
    set credits_remaining = v_after,
        purchased_credits_remaining = v_purchased,
        monthly_credit_limit = 0,
        plan_name = 'Free',
        subscription_plan = 'free',
        subscription_status = v_status,
        payment_provider = 'stripe',
        provider_customer_id = coalesce(nullif(trim(coalesce(p_customer_id,'')),''), provider_customer_id),
        provider_subscription_id = coalesce(nullif(trim(coalesce(p_subscription_id,'')),''), provider_subscription_id),
        subscription_price_lookup_key = p_lookup_key,
        subscription_interval = p_interval,
        subscription_price_amount = p_price_amount,
        subscription_currency = upper(coalesce(nullif(trim(coalesce(p_currency,'')),''),'SEK')),
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = false,
        next_credit_refresh_at = null,
        pending_subscription_plan = null,
        pending_subscription_lookup_key = null,
        pending_subscription_effective_at = null,
        provider_subscription_schedule_id = null,
        trial_start = coalesce(trial_start,p_trial_start),
        trial_end = coalesce(trial_end,p_trial_end),
        updated_at = now()
    where user_id = p_user_id;
    return jsonb_build_object('free',true,'credits_remaining',v_after,'purchased_credits_remaining',v_purchased,'paused_recurring_rules',true);
  end if;

  v_purchased := least(greatest(coalesce(v_balance.purchased_credits_remaining,0),0), v_before);

  if v_trial then
    v_trial_source := 'trial_activation:' || coalesce(nullif(trim(coalesce(p_subscription_id,'')),''), p_user_id::text);
    if not exists(select 1 from public.stripe_credit_grants where source_id = v_trial_source) then
      v_after := greatest(coalesce(p_trial_credits,100),0) + v_purchased;
      insert into public.stripe_credit_grants(user_id,source_id,grant_type,lookup_key,credits,balance_before,balance_after,purchased_balance_after)
      values(p_user_id,v_trial_source,'trial_activation',p_lookup_key,greatest(coalesce(p_trial_credits,100),0),v_before,v_after,v_purchased)
      on conflict(source_id) do nothing;
    else
      v_after := v_before;
    end if;

    update public.user_credit_balances
    set credits_remaining = v_after,
        purchased_credits_remaining = v_purchased,
        monthly_credit_limit = greatest(coalesce(p_trial_credits,100),0),
        plan_name = initcap(p_plan) || ' Trial',
        subscription_plan = lower(p_plan),
        subscription_status = 'trialing',
        payment_provider = 'stripe',
        provider_customer_id = coalesce(nullif(trim(coalesce(p_customer_id,'')),''), provider_customer_id),
        provider_subscription_id = coalesce(nullif(trim(coalesce(p_subscription_id,'')),''), provider_subscription_id),
        subscription_price_lookup_key = p_lookup_key,
        subscription_interval = p_interval,
        subscription_price_amount = p_price_amount,
        subscription_currency = upper(coalesce(nullif(trim(coalesce(p_currency,'')),''),'SEK')),
        current_period_start = p_current_period_start,
        current_period_end = p_current_period_end,
        cancel_at_period_end = coalesce(p_cancel_at_period_end,false),
        trial_start = coalesce(p_trial_start,trial_start),
        trial_end = coalesce(p_trial_end,trial_end),
        credits_renewed_at = case when v_after <> v_before then now() else credits_renewed_at end,
        next_credit_refresh_at = p_trial_end,
        updated_at = now()
    where user_id = p_user_id;
    return jsonb_build_object('trial',true,'credits_remaining',v_after,'trial_end',p_trial_end);
  end if;

  if v_should_grant and nullif(trim(coalesce(p_source_id,'')),'') is not null then
    select * into v_existing from public.stripe_credit_grants where source_id = p_source_id;
    if found then v_should_grant := false; end if;
  end if;

  v_after := case when v_should_grant then greatest(coalesce(p_monthly_credits,0),0) + v_purchased else v_before end;

  update public.user_credit_balances
  set credits_remaining = v_after,
      purchased_credits_remaining = case when v_should_grant then v_purchased else purchased_credits_remaining end,
      monthly_credit_limit = greatest(coalesce(p_monthly_credits,0),0),
      plan_name = initcap(p_plan),
      subscription_plan = lower(p_plan),
      subscription_status = v_status,
      payment_provider = 'stripe',
      provider_customer_id = coalesce(nullif(trim(coalesce(p_customer_id,'')),''), provider_customer_id),
      provider_subscription_id = coalesce(nullif(trim(coalesce(p_subscription_id,'')),''), provider_subscription_id),
      subscription_price_lookup_key = p_lookup_key,
      subscription_interval = p_interval,
      subscription_price_amount = p_price_amount,
      subscription_currency = upper(coalesce(nullif(trim(coalesce(p_currency,'')),''),'SEK')),
      current_period_start = p_current_period_start,
      current_period_end = p_current_period_end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end,false),
      trial_start = coalesce(trial_start,p_trial_start),
      trial_end = coalesce(trial_end,p_trial_end),
      credits_renewed_at = case when v_should_grant then now() else credits_renewed_at end,
      next_credit_refresh_at = case
        when p_interval='year' and (v_should_grant or next_credit_refresh_at is null) then p_next_credit_refresh_at
        when p_interval='month' then p_current_period_end
        else next_credit_refresh_at
      end,
      pending_subscription_plan = case when pending_subscription_lookup_key = p_lookup_key then null else pending_subscription_plan end,
      pending_subscription_lookup_key = case when pending_subscription_lookup_key = p_lookup_key then null else pending_subscription_lookup_key end,
      pending_subscription_effective_at = case when pending_subscription_lookup_key = p_lookup_key then null else pending_subscription_effective_at end,
      provider_subscription_schedule_id = case when pending_subscription_lookup_key = p_lookup_key then null else provider_subscription_schedule_id end,
      updated_at = now()
  where user_id = p_user_id;

  if v_should_grant and nullif(trim(coalesce(p_source_id,'')),'') is not null then
    insert into public.stripe_credit_grants(user_id,source_id,grant_type,lookup_key,credits,balance_before,balance_after,purchased_balance_after)
    values(p_user_id,p_source_id,'subscription_refresh',p_lookup_key,greatest(coalesce(p_monthly_credits,0),0),v_before,v_after,v_purchased)
    on conflict(source_id) do nothing;
  end if;

  return jsonb_build_object('granted',v_should_grant,'credits_remaining',v_after,'purchased_credits_remaining',v_purchased,'monthly_credit_limit',p_monthly_credits);
end;
$$;

create or replace function public.finalize_stripe_plan_change(
  p_user_id uuid,
  p_subscription_id text,
  p_invoice_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_change public.stripe_plan_changes%rowtype;
  v_balance public.user_credit_balances%rowtype;
  v_before integer;
  v_after integer;
  v_purchased integer;
begin
  select * into v_change
  from public.stripe_plan_changes
  where user_id=p_user_id and subscription_id=p_subscription_id and status='pending'
  order by created_at desc limit 1 for update;
  if not found then return jsonb_build_object('found',false); end if;

  select * into v_balance from public.user_credit_balances where user_id=p_user_id for update;
  if not found then raise exception 'No credit balance found.'; end if;

  v_before := greatest(coalesce(v_balance.credits_remaining,0),0);
  v_purchased := least(greatest(coalesce(v_balance.purchased_credits_remaining,0),0),v_before);
  if v_change.credit_mode='delta' then
    v_after := v_before + greatest(v_change.credit_amount,0);
  elsif v_change.credit_mode='full' then
    v_after := greatest(v_change.target_monthly_credits,0) + v_purchased;
  else
    v_after := v_before;
  end if;

  update public.user_credit_balances
  set credits_remaining=v_after,
      monthly_credit_limit=case when v_change.target_monthly_credits>0 then v_change.target_monthly_credits else monthly_credit_limit end,
      updated_at=now()
  where user_id=p_user_id;

  if v_change.credit_mode <> 'none' and (v_change.credit_amount>0 or v_change.credit_mode='full') then
    insert into public.stripe_credit_grants(user_id,source_id,grant_type,lookup_key,credits,balance_before,balance_after,purchased_balance_after)
    values(p_user_id,'plan_change:'||coalesce(p_invoice_id,v_change.id::text),'plan_upgrade',v_change.target_lookup_key,
      case when v_change.credit_mode='delta' then greatest(v_change.credit_amount,0) else greatest(v_change.target_monthly_credits,0) end,
      v_before,v_after,v_purchased)
    on conflict(source_id) do nothing;
  end if;

  update public.stripe_plan_changes
  set status='completed',invoice_id=p_invoice_id,updated_at=now() where id=v_change.id;

  return jsonb_build_object('found',true,'credits_remaining',v_after,'change_id',v_change.id);
end;
$$;


-- Annual subscriptions are paid yearly but receive their allowance monthly.
-- Trialing subscriptions are deliberately excluded: their 100 trial credits
-- remain fixed until the first invoice is actually paid.
create or replace function public.refresh_due_annual_subscription_credits(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.user_credit_balances%rowtype;
  v_before integer;
  v_after integer;
  v_purchased integer;
  v_next timestamptz;
  v_count integer := 0;
  v_total integer := 0;
  v_source text;
begin
  for v_row in
    select *
    from public.user_credit_balances
    where payment_provider = 'stripe'
      and subscription_interval = 'year'
      and subscription_status = 'active'
      and next_credit_refresh_at is not null
      and next_credit_refresh_at <= now()
      and (current_period_end is null or current_period_end > now())
    order by next_credit_refresh_at asc
    limit greatest(1, least(coalesce(p_limit, 500), 2000))
    for update skip locked
  loop
    v_source := 'annual_refresh:' || v_row.user_id::text || ':' || to_char(v_row.next_credit_refresh_at at time zone 'utc', 'YYYYMMDDHH24MISS');
    if exists(select 1 from public.stripe_credit_grants where source_id = v_source) then
      v_next := v_row.next_credit_refresh_at + interval '1 month';
      update public.user_credit_balances set next_credit_refresh_at = v_next, updated_at = now() where user_id = v_row.user_id;
      continue;
    end if;

    v_before := greatest(coalesce(v_row.credits_remaining, 0), 0);
    v_purchased := least(greatest(coalesce(v_row.purchased_credits_remaining, 0), 0), v_before);
    v_after := greatest(coalesce(v_row.monthly_credit_limit, 0), 0) + v_purchased;
    v_next := v_row.next_credit_refresh_at + interval '1 month';
    while v_next <= now() loop v_next := v_next + interval '1 month'; end loop;

    update public.user_credit_balances
    set credits_remaining = v_after,
        purchased_credits_remaining = v_purchased,
        credits_renewed_at = now(),
        next_credit_refresh_at = v_next,
        updated_at = now()
    where user_id = v_row.user_id;

    insert into public.stripe_credit_grants (
      user_id, source_id, grant_type, lookup_key, credits, balance_before, balance_after, purchased_balance_after
    ) values (
      v_row.user_id, v_source, 'annual_monthly_refresh', v_row.subscription_price_lookup_key,
      greatest(coalesce(v_row.monthly_credit_limit, 0), 0), v_before, v_after, v_purchased
    );

    v_count := v_count + 1;
    v_total := v_total + greatest(coalesce(v_row.monthly_credit_limit, 0), 0);
  end loop;

  return jsonb_build_object('refreshed_accounts', v_count, 'credits_granted', v_total);
end;
$$;

-- Recurring schedules are a paid/trial capability. Purchased credits remain
-- usable on Free, but Free must not reactivate or create weekly automation.
create or replace function public.enforce_paid_recurring_schedule_v14378()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_status text;
begin
  if coalesce(new.schedule_type,'') <> 'weekly' or coalesce(new.is_active,false) = false then
    return new;
  end if;

  select lower(coalesce(subscription_plan, plan_name, '')), lower(coalesce(subscription_status,''))
    into v_plan, v_status
  from public.user_credit_balances
  where user_id = new.user_id;

  if v_plan = 'free' or v_status in ('canceled','cancelled','expired','incomplete_expired') then
    raise exception 'Recurring schedules require an active Spreelo subscription or trial.';
  end if;
  return new;
end;
$$;

drop trigger if exists automation_rules_paid_recurring_guard_v14378 on public.automation_rules;
create trigger automation_rules_paid_recurring_guard_v14378
before insert or update of is_active, schedule_type on public.automation_rules
for each row execute function public.enforce_paid_recurring_schedule_v14378();

revoke all on function public.claim_spreelo_trial_business(uuid,text,text,uuid) from public,anon,authenticated;
revoke all on function public.mark_spreelo_trial_business(uuid,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.apply_stripe_subscription_state_v14378(uuid,text,integer,text,text,text,text,text,timestamptz,timestamptz,boolean,bigint,text,boolean,text,timestamptz,boolean,integer,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.finalize_stripe_plan_change(uuid,text,text) from public,anon,authenticated;

grant execute on function public.claim_spreelo_trial_business(uuid,text,text,uuid) to service_role;
grant execute on function public.mark_spreelo_trial_business(uuid,text,text,text,text,timestamptz,timestamptz) to service_role;
grant execute on function public.apply_stripe_subscription_state_v14378(uuid,text,integer,text,text,text,text,text,timestamptz,timestamptz,boolean,bigint,text,boolean,text,timestamptz,boolean,integer,timestamptz,timestamptz) to service_role;
grant execute on function public.finalize_stripe_plan_change(uuid,text,text) to service_role;
