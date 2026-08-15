-- Spreelo v143.96: every generated customer post must pass the Spreelo admin
-- workbench. Terminal generation failures remain durable repair cases.

insert into public.spreelo_admin_settings (id, require_admin_post_approval)
values ('global', true)
on conflict (id) do update
set require_admin_post_approval = true,
    updated_at = now();

alter table public.brand_profiles
  alter column admin_review_required set default true;

update public.brand_profiles
set admin_review_required = true,
    updated_at = now()
where admin_review_required is distinct from true;

comment on column public.brand_profiles.admin_review_required is
  'All generated posts require Spreelo admin review. Kept for schema compatibility; false is no longer a delivery bypass.';
