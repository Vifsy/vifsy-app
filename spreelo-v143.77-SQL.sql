-- Spreelo v143.77: Stripe Billing / Managed Payments sandbox integration.
-- Run once in Supabase SQL Editor before deploying v143.77.
-- This migration is idempotent and does not require live Stripe credentials.

create extension if not exists pgcrypto;

alter table public.user_credit_balances
  add column if not exists payment_provider text,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists subscription_price_lookup_key text,
  add column if not exists subscription_interval text,
  add column if not exists subscription_price_amount bigint,
  add column if not exists subscription_currency text,
  add column if not exists subscription_status text,
  add column if not exists subscription_plan text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists next_credit_refresh_at timestamptz,
  add column if not exists credits_renewed_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists purchased_credits_remaining integer not null default 0;

create unique index if not exists user_credit_balances_provider_customer_uidx
  on public.user_credit_balances (provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists user_credit_balances_provider_subscription_uidx
  on public.user_credit_balances (provider_subscription_id)
  where provider_subscription_id is not null;

create index if not exists user_credit_balances_next_credit_refresh_idx
  on public.user_credit_balances (next_credit_refresh_at)
  where payment_provider = 'stripe' and subscription_interval = 'year';

comment on column public.user_credit_balances.purchased_credits_remaining is
  'Non-expiring purchased-credit pool. At subscription refresh Spreelo preserves the still-unspent part of this pool.';
comment on column public.user_credit_balances.next_credit_refresh_at is
  'Next monthly credit refresh. Required for prepaid annual subscriptions, whose Stripe invoice is yearly.';

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing',
  attempts integer not null default 1,
  last_error text,
  first_received_at timestamptz not null default now(),
  processing_started_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on public.stripe_webhook_events from public, anon, authenticated;

create table if not exists public.stripe_credit_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source_id text not null unique,
  grant_type text not null,
  lookup_key text,
  credits integer not null check (credits >= 0),
  balance_before integer not null,
  balance_after integer not null,
  purchased_balance_after integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stripe_credit_grants_user_created_idx
  on public.stripe_credit_grants (user_id, created_at desc);

alter table public.stripe_credit_grants enable row level security;
revoke all on public.stripe_credit_grants from public, anon, authenticated;

create or replace function public.claim_stripe_webhook_event(
  p_event_id text,
  p_event_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.stripe_webhook_events%rowtype;
  v_inserted integer := 0;
begin
  if nullif(trim(coalesce(p_event_id, '')), '') is null then
    raise exception 'Stripe event id is required.';
  end if;

  insert into public.stripe_webhook_events (event_id, event_type, status)
  values (p_event_id, coalesce(nullif(trim(p_event_type), ''), 'unknown'), 'processing')
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 1 then
    return jsonb_build_object('claimed', true, 'already_processed', false, 'busy', false);
  end if;

  select * into v_row
  from public.stripe_webhook_events
  where event_id = p_event_id
  for update;

  if v_row.status = 'processed' then
    return jsonb_build_object('claimed', false, 'already_processed', true, 'busy', false);
  end if;

  if v_row.status = 'processing'
     and v_row.processing_started_at > now() - interval '10 minutes' then
    return jsonb_build_object('claimed', false, 'already_processed', false, 'busy', true);
  end if;

  update public.stripe_webhook_events
  set status = 'processing',
      event_type = coalesce(nullif(trim(p_event_type), ''), event_type),
      attempts = attempts + 1,
      processing_started_at = now(),
      updated_at = now()
  where event_id = p_event_id;

  return jsonb_build_object('claimed', true, 'already_processed', false, 'busy', false);
end;
$$;

create or replace function public.complete_stripe_webhook_event(p_event_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stripe_webhook_events
  set status = 'processed', processed_at = now(), last_error = null, updated_at = now()
  where event_id = p_event_id;
$$;

create or replace function public.fail_stripe_webhook_event(p_event_id text, p_error text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.stripe_webhook_events
  set status = 'failed', last_error = left(coalesce(p_error, 'Unknown error'), 1000), updated_at = now()
  where event_id = p_event_id;
$$;

create or replace function public.grant_stripe_purchased_credits(
  p_user_id uuid,
  p_credits integer,
  p_source_id text,
  p_lookup_key text
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
  v_existing public.stripe_credit_grants%rowtype;
begin
  if p_user_id is null or p_credits is null or p_credits <= 0 then
    raise exception 'A valid user and positive credit amount are required.';
  end if;
  if nullif(trim(coalesce(p_source_id, '')), '') is null then
    raise exception 'Stripe source id is required.';
  end if;

  select * into v_existing from public.stripe_credit_grants where source_id = p_source_id;
  if found then
    return jsonb_build_object('duplicate', true, 'credits_remaining', v_existing.balance_after);
  end if;

  select * into v_balance
  from public.user_credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'No credit balance found for this Spreelo account.';
  end if;

  v_before := greatest(coalesce(v_balance.credits_remaining, 0), 0);
  v_after := v_before + p_credits;

  update public.user_credit_balances
  set credits_remaining = v_after,
      purchased_credits_remaining = greatest(coalesce(purchased_credits_remaining, 0), 0) + p_credits,
      payment_provider = 'stripe',
      updated_at = now()
  where user_id = p_user_id;

  insert into public.stripe_credit_grants (
    user_id, source_id, grant_type, lookup_key, credits,
    balance_before, balance_after, purchased_balance_after
  ) values (
    p_user_id, p_source_id, 'credit_pack', p_lookup_key, p_credits,
    v_before, v_after, greatest(coalesce(v_balance.purchased_credits_remaining, 0), 0) + p_credits
  );

  return jsonb_build_object('duplicate', false, 'granted', p_credits, 'credits_remaining', v_after);
end;
$$;

create or replace function public.apply_stripe_subscription_state(
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
  p_next_credit_refresh_at timestamptz
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
begin
  if p_user_id is null then raise exception 'User id is required.'; end if;
  if p_monthly_credits is null or p_monthly_credits <= 0 then raise exception 'Monthly credits must be positive.'; end if;
  if p_interval not in ('month','year') then raise exception 'Unsupported subscription interval.'; end if;

  select * into v_balance
  from public.user_credit_balances
  where user_id = p_user_id
  for update;

  if not found then
    raise exception 'No credit balance found for this Spreelo account.';
  end if;

  if v_should_grant and nullif(trim(coalesce(p_source_id, '')), '') is not null then
    select * into v_existing from public.stripe_credit_grants where source_id = p_source_id;
    if found then v_should_grant := false; end if;
  end if;

  v_before := greatest(coalesce(v_balance.credits_remaining, 0), 0);
  -- Subscription credits are consumed before purchased credits. Because legacy
  -- spend paths still update the total balance, the remaining non-expiring pool
  -- can safely be bounded by the current total at each monthly refresh.
  v_purchased := least(
    greatest(coalesce(v_balance.purchased_credits_remaining, 0), 0),
    v_before
  );
  v_after := case when v_should_grant then p_monthly_credits + v_purchased else v_before end;

  update public.user_credit_balances
  set credits_remaining = v_after,
      purchased_credits_remaining = case when v_should_grant then v_purchased else purchased_credits_remaining end,
      monthly_credit_limit = p_monthly_credits,
      plan_name = initcap(p_plan),
      subscription_plan = lower(p_plan),
      subscription_status = lower(coalesce(p_status, 'active')),
      payment_provider = 'stripe',
      provider_customer_id = coalesce(nullif(trim(p_customer_id), ''), provider_customer_id),
      provider_subscription_id = coalesce(nullif(trim(p_subscription_id), ''), provider_subscription_id),
      subscription_price_lookup_key = p_lookup_key,
      subscription_interval = p_interval,
      subscription_price_amount = p_price_amount,
      subscription_currency = upper(coalesce(nullif(trim(p_currency), ''), 'SEK')),
      current_period_start = p_current_period_start,
      current_period_end = p_current_period_end,
      cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
      credits_renewed_at = case when v_should_grant then now() else credits_renewed_at end,
      next_credit_refresh_at = case
        when p_interval = 'year' and (v_should_grant or next_credit_refresh_at is null)
          then p_next_credit_refresh_at
        when p_interval = 'month' then p_current_period_end
        else next_credit_refresh_at
      end,
      updated_at = now()
  where user_id = p_user_id;

  if v_should_grant and nullif(trim(coalesce(p_source_id, '')), '') is not null then
    insert into public.stripe_credit_grants (
      user_id, source_id, grant_type, lookup_key, credits,
      balance_before, balance_after, purchased_balance_after
    ) values (
      p_user_id, p_source_id, 'subscription_refresh', p_lookup_key, p_monthly_credits,
      v_before, v_after, v_purchased
    ) on conflict (source_id) do nothing;
  end if;

  return jsonb_build_object(
    'granted', v_should_grant,
    'credits_remaining', v_after,
    'purchased_credits_remaining', v_purchased,
    'monthly_credit_limit', p_monthly_credits
  );
end;
$$;

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
      and subscription_status in ('active','trialing')
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
      user_id, source_id, grant_type, lookup_key, credits,
      balance_before, balance_after, purchased_balance_after
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

revoke all on function public.claim_stripe_webhook_event(text, text) from public, anon, authenticated;
revoke all on function public.complete_stripe_webhook_event(text) from public, anon, authenticated;
revoke all on function public.fail_stripe_webhook_event(text, text) from public, anon, authenticated;
revoke all on function public.grant_stripe_purchased_credits(uuid, integer, text, text) from public, anon, authenticated;
revoke all on function public.apply_stripe_subscription_state(uuid, text, integer, text, text, text, text, text, timestamptz, timestamptz, boolean, bigint, text, boolean, text, timestamptz) from public, anon, authenticated;
revoke all on function public.refresh_due_annual_subscription_credits(integer) from public, anon, authenticated;

grant execute on function public.claim_stripe_webhook_event(text, text) to service_role;
grant execute on function public.complete_stripe_webhook_event(text) to service_role;
grant execute on function public.fail_stripe_webhook_event(text, text) to service_role;
grant execute on function public.grant_stripe_purchased_credits(uuid, integer, text, text) to service_role;
grant execute on function public.apply_stripe_subscription_state(uuid, text, integer, text, text, text, text, text, timestamptz, timestamptz, boolean, bigint, text, boolean, text, timestamptz) to service_role;
grant execute on function public.refresh_due_annual_subscription_credits(integer) to service_role;
