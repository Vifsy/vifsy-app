-- Spreelo v143.74: Admin Content & Credits control center.
-- Adds configurable customer credit costs, plan availability, estimated production cost,
-- scheduled credit changes, and an immutable audit trail.

alter table public.content_format_library
  add column if not exists display_label text,
  add column if not exists description text,
  add column if not exists customer_credit_cost integer not null default 10,
  add column if not exists estimated_cost_sek numeric(12,4),
  add column if not exists available_starter boolean not null default true,
  add column if not exists available_growth boolean not null default true,
  add column if not exists available_pro boolean not null default true,
  add column if not exists pending_credit_cost integer,
  add column if not exists pending_effective_at timestamptz,
  add column if not exists is_custom boolean not null default false;

alter table public.content_format_library
  drop constraint if exists content_format_library_customer_credit_cost_check;
alter table public.content_format_library
  add constraint content_format_library_customer_credit_cost_check
  check (customer_credit_cost >= 1 and customer_credit_cost <= 100000);

alter table public.content_format_library
  drop constraint if exists content_format_library_pending_credit_cost_check;
alter table public.content_format_library
  add constraint content_format_library_pending_credit_cost_check
  check (pending_credit_cost is null or (pending_credit_cost >= 1 and pending_credit_cost <= 100000));

alter table public.content_format_library
  drop constraint if exists content_format_library_estimated_cost_sek_check;
alter table public.content_format_library
  add constraint content_format_library_estimated_cost_sek_check
  check (estimated_cost_sek is null or estimated_cost_sek >= 0);

-- Initial 10x customer-facing credit scale. These are intentionally editable from Admin.
update public.content_format_library
set customer_credit_cost = case content_type_id
  when 'website_item' then 10
  when 'website_item_text_ad' then 20
  when 'animated_website_item' then 50
  when 'carousel_website_item' then 20
  when 'problem_solution' then 10
  when 'tips' then 10
  when 'offer_campaign' then 10
  when 'focus_source' then 10
  when 'mistakes' then 10
  when 'faq' then 10
  when 'checklist' then 10
  when 'service_focus' then 10
  when 'myth_fact' then 10
  when 'seasonal' then 10
  when 'mini_guide' then 10
  when 'manual_prompt' then 10
  else greatest(coalesce(customer_credit_cost, 10), 1)
end,
updated_at = now()
where content_type_id in (
  'website_item','website_item_text_ad','animated_website_item','carousel_website_item',
  'problem_solution','tips','offer_campaign','focus_source','mistakes','faq','checklist',
  'service_focus','myth_fact','seasonal','mini_guide','manual_prompt'
);

create table if not exists public.content_credit_audit (
  id uuid primary key default gen_random_uuid(),
  content_type_id text not null,
  change_type text not null default 'update',
  changed_fields jsonb not null default '{}'::jsonb,
  before_state jsonb,
  after_state jsonb,
  changed_by uuid,
  changed_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists content_credit_audit_type_created_idx
  on public.content_credit_audit (content_type_id, created_at desc);
create index if not exists content_credit_audit_created_idx
  on public.content_credit_audit (created_at desc);

alter table public.content_credit_audit enable row level security;
revoke all on public.content_credit_audit from public, anon, authenticated;

create table if not exists public.content_economics_settings (
  setting_key text primary key,
  numeric_value numeric(12,4),
  text_value text,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

insert into public.content_economics_settings (setting_key, numeric_value)
values ('reference_credit_value_sek', 1.70)
on conflict (setting_key) do nothing;

alter table public.content_economics_settings enable row level security;
revoke all on public.content_economics_settings from public, anon, authenticated;

comment on column public.content_format_library.customer_credit_cost is
  'Current customer-facing credit cost used for newly created content plans.';
comment on column public.content_format_library.pending_credit_cost is
  'Optional future customer credit cost. Runtime uses it after pending_effective_at.';
comment on column public.content_format_library.estimated_cost_sek is
  'Admin-maintained estimated Spreelo production cost per successful generated post.';
comment on column public.content_format_library.is_custom is
  'Catalog-only custom type created in Admin. It is not generator-ready until the codebase supports its content_type_id.';
