-- Spreelo v143.76: professional Admin reliability windows.
-- Keeps historical run data intact and stores only the point from which Admin
-- should calculate fresh reliability statistics for each content type.

alter table public.content_format_library
  add column if not exists stats_reset_at timestamptz;

comment on column public.content_format_library.stats_reset_at is
  'Admin-only reliability statistics start point. Historical automation logs are never deleted.';
