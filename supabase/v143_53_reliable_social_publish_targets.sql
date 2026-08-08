-- Spreelo v143.53 — durable per-platform publish receipts
-- Run once in Supabase SQL Editor before deploying v143.53.

alter table public.posts
  add column if not exists published_targets text[] not null default '{}'::text[],
  add column if not exists publish_receipts jsonb not null default '{}'::jsonb;

comment on column public.posts.published_targets is
  'Social destinations that have already accepted this post. Used to make retries duplicate-safe across multi-platform publishing.';
comment on column public.posts.publish_receipts is
  'Provider publish receipts keyed by platform, for example the Pinterest Pin id and receipt timestamp.';
