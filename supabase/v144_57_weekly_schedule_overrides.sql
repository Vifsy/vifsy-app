-- Spreelo v144.57 — weekly schedule occurrence overrides

create extension if not exists pgcrypto;
-- Lets customers move or change one future weekly occurrence without changing
-- the permanent weekly template. Historical/generated occurrences stay locked.

create table if not exists public.automation_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  brand_profile_id uuid null,
  automation_rule_id uuid not null,
  base_run_date date not null,
  override_run_date date null,
  override_publish_time time null,
  override_content_type_id text null,
  override_content_type_label text null,
  override_content_format text null,
  override_credit_cost integer null check (override_credit_cost is null or override_credit_cost > 0),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (automation_rule_id, base_run_date)
);

-- If the first v144.57 migration was already run, make the rule relation
-- cleanup-safe as well. Orphan overrides have no executable meaning.
delete from public.automation_schedule_overrides o
where not exists (
  select 1 from public.automation_rules r where r.id = o.automation_rule_id
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'automation_schedule_overrides_rule_fk'
      and conrelid = 'public.automation_schedule_overrides'::regclass
  ) then
    alter table public.automation_schedule_overrides
      add constraint automation_schedule_overrides_rule_fk
      foreign key (automation_rule_id)
      references public.automation_rules(id)
      on delete cascade;
  end if;
end $$;

create index if not exists automation_schedule_overrides_user_date_idx
  on public.automation_schedule_overrides (user_id, base_run_date);
create index if not exists automation_schedule_overrides_rule_date_idx
  on public.automation_schedule_overrides (automation_rule_id, base_run_date);

alter table public.automation_schedule_overrides enable row level security;

drop policy if exists "Users can view their own schedule overrides"
  on public.automation_schedule_overrides;
create policy "Users can view their own schedule overrides"
  on public.automation_schedule_overrides
  for select to authenticated
  using (auth.uid() = user_id);

-- Schedule mutations are server-mediated. Do not allow direct authenticated
-- writes, because a client-supplied automation_rule_id must never be able to
-- target another customer's recurring rule. The authenticated app only needs
-- SELECT; the verified API route uses the service role for mutations.
drop policy if exists "Users can create their own schedule overrides"
  on public.automation_schedule_overrides;
drop policy if exists "Users can update their own schedule overrides"
  on public.automation_schedule_overrides;
drop policy if exists "Users can delete their own schedule overrides"
  on public.automation_schedule_overrides;

-- Adjust the single credit reservation attached to the rule when the next
-- occurrence has a one-week content override with a different credit cost.
-- The recurring rule's normal credit_cost is deliberately left unchanged so
-- the following week returns to its normal/adaptive reservation.
create or replace function public.adjust_schedule_override_reservation(
  p_rule_id uuid,
  p_target_cost integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.automation_rules%rowtype;
  v_target integer := greatest(coalesce(p_target_cost, 1), 1);
  v_current integer := 0;
  v_delta integer := 0;
  v_balance integer := 0;
begin
  select * into v_rule
  from public.automation_rules
  where id = p_rule_id
  for update;

  if not found then
    return jsonb_build_object('handled', false, 'funded', false, 'reason', 'rule_not_found');
  end if;

  if v_rule.credit_reservation_status <> 'reserved' then
    return jsonb_build_object(
      'handled', false,
      'funded', true,
      'status', coalesce(v_rule.credit_reservation_status, 'legacy')
    );
  end if;

  v_current := greatest(coalesce(v_rule.credit_reserved_amount, v_rule.credit_cost, 1), 1);
  v_delta := v_target - v_current;

  if v_delta = 0 then
    return jsonb_build_object('handled', true, 'funded', true, 'credit_delta', 0, 'reserved_amount', v_target);
  end if;

  select credits_remaining into v_balance
  from public.user_credit_balances
  where user_id = v_rule.user_id
  for update;

  if not found then
    return jsonb_build_object('handled', true, 'funded', false, 'reason', 'missing_credit_balance');
  end if;

  if v_delta > 0 and v_balance < v_delta then
    return jsonb_build_object(
      'handled', true,
      'funded', false,
      'reason', 'insufficient_credits',
      'additional_required', v_delta,
      'credits_remaining', v_balance
    );
  end if;

  update public.user_credit_balances
  set credits_remaining = credits_remaining - v_delta,
      updated_at = now()
  where user_id = v_rule.user_id;

  update public.automation_rules
  set credit_reserved_amount = v_target,
      credit_reserved_at = case when v_delta > 0 then now() else credit_reserved_at end,
      updated_at = now()
  where id = p_rule_id;

  insert into public.credit_reservation_events (
    user_id,
    automation_rule_id,
    brand_profile_id,
    rule_name,
    content_type_id,
    event_type,
    amount,
    reason,
    metadata
  ) values (
    v_rule.user_id,
    v_rule.id,
    v_rule.brand_profile_id,
    v_rule.name,
    v_rule.content_type_id,
    case when v_delta > 0 then 'adjusted_up' else 'adjusted_down' end,
    -v_delta,
    'Credits adjusted for a customer schedule occurrence override',
    jsonb_build_object('target_credit_cost', v_target, 'previous_reserved_amount', v_current)
  );

  return jsonb_build_object(
    'handled', true,
    'funded', true,
    'credit_delta', v_delta,
    'reserved_amount', v_target,
    'credits_remaining', v_balance - v_delta
  );
end;
$$;

revoke all on function public.adjust_schedule_override_reservation(uuid, integer) from public, anon, authenticated;
grant execute on function public.adjust_schedule_override_reservation(uuid, integer) to service_role;
