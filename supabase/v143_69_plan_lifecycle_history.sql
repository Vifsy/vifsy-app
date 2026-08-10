-- Spreelo v143.69
-- Durable pause/resume/end state for Home operational schedules while keeping
-- ended plans visible in History. Ending a plan returns any still-reserved
-- credits but keeps the automation_rules rows as read-only history.

alter table public.automation_rules
  add column if not exists plan_state text not null default 'active',
  add column if not exists plan_ended_at timestamptz;

alter table public.automation_rules
  drop constraint if exists automation_rules_plan_state_check;

alter table public.automation_rules
  add constraint automation_rules_plan_state_check
  check (plan_state in ('active', 'paused', 'ended'));

update public.automation_rules
set plan_state = case
  when plan_ended_at is not null then 'ended'
  when is_active = false and schedule_type = 'weekly' and plan_state = 'active' then 'paused'
  else plan_state
end
where plan_ended_at is not null
   or (is_active = false and schedule_type = 'weekly' and plan_state = 'active')
   or plan_state not in ('active', 'paused', 'ended');

create or replace function public.end_automation_rules_keep_history(p_rule_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_release_total integer := 0;
  v_rule record;
begin
  if v_user_id is null then
    raise exception 'You must be logged in.';
  end if;

  select coalesce(sum(case
    when credit_reservation_status = 'reserved'
    then greatest(coalesce(credit_reserved_amount, credit_cost, 1), 1)
    else 0
  end), 0)
  into v_release_total
  from public.automation_rules
  where user_id = v_user_id
    and id = any(p_rule_ids);

  if v_release_total > 0 then
    perform 1
    from public.user_credit_balances
    where user_id = v_user_id
    for update;

    update public.user_credit_balances
    set credits_remaining = credits_remaining + v_release_total,
        updated_at = now()
    where user_id = v_user_id;
  end if;

  for v_rule in
    select
      id,
      brand_profile_id,
      name,
      content_type_id,
      greatest(coalesce(credit_reserved_amount, credit_cost, 1), 1) as amount
    from public.automation_rules
    where user_id = v_user_id
      and id = any(p_rule_ids)
      and credit_reservation_status = 'reserved'
  loop
    insert into public.credit_reservation_events (
      user_id,
      automation_rule_id,
      brand_profile_id,
      rule_name,
      content_type_id,
      event_type,
      amount,
      reason
    ) values (
      v_user_id,
      v_rule.id,
      v_rule.brand_profile_id,
      v_rule.name,
      v_rule.content_type_id,
      'released',
      v_rule.amount,
      'Reserved credits returned after schedule was ended and moved to history'
    );
  end loop;

  update public.automation_rules
  set is_active = false,
      plan_state = 'ended',
      plan_ended_at = now(),
      credit_reservation_status = case
        when credit_reservation_status = 'reserved' then 'released'
        else credit_reservation_status
      end,
      credit_reserved_amount = case
        when credit_reservation_status = 'reserved' then 0
        else credit_reserved_amount
      end,
      credit_released_at = case
        when credit_reservation_status = 'reserved' then now()
        else credit_released_at
      end,
      queue_locked_until = null,
      retry_not_before = null,
      updated_at = now()
  where user_id = v_user_id
    and id = any(p_rule_ids);

  return jsonb_build_object(
    'ended_rules', coalesce(array_length(p_rule_ids, 1), 0),
    'released_credits', v_release_total
  );
end;
$$;

revoke all on function public.end_automation_rules_keep_history(uuid[]) from public, anon;
grant execute on function public.end_automation_rules_keep_history(uuid[]) to authenticated;
