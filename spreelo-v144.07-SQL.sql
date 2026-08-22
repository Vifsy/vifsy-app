-- Spreelo v144.07: Kling AI product-video support.
-- Run once in Supabase SQL Editor before deploying v144.07.
--
-- Cost-safety invariant:
--   each post may claim Kling generation exactly once (0 -> 1).
--   Polling/finalization never increments this counter and never submits a replacement job.

alter table public.posts
  add column if not exists content_type_id text,
  add column if not exists kling_generation_count integer not null default 0,
  add column if not exists kling_task_id text,
  add column if not exists kling_task_status text,
  add column if not exists kling_prompt text,
  add column if not exists kling_reference_image_url text,
  add column if not exists kling_submitted_at timestamptz,
  add column if not exists kling_completed_at timestamptz,
  add column if not exists kling_last_polled_at timestamptz,
  add column if not exists kling_api_family text,
  add column if not exists kling_model text,
  add column if not exists kling_resolution text,
  add column if not exists kling_audio text;

alter table public.posts
  drop constraint if exists posts_kling_generation_count_check;

alter table public.posts
  add constraint posts_kling_generation_count_check
  check (kling_generation_count >= 0 and kling_generation_count <= 1);

create unique index if not exists posts_kling_task_id_unique_idx
  on public.posts (kling_task_id)
  where kling_task_id is not null;

create index if not exists posts_kling_pending_idx
  on public.posts (kling_submitted_at asc)
  where video_provider = 'kling'
    and video_status in ('submitting', 'submitted', 'created', 'queued', 'pending', 'processing', 'rendering');

-- Atomic single-generation guard. With multiple Vercel workers, only one caller
-- can ever change a given post from kling_generation_count=0 to 1.
create or replace function public.claim_kling_video_generation(p_post_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed_id uuid;
begin
  update public.posts
  set
    kling_generation_count = 1,
    video_provider = 'kling',
    video_status = 'submitting',
    kling_task_status = 'submitting',
    kling_submitted_at = coalesce(kling_submitted_at, now()),
    updated_at = now()
  where id = p_post_id
    and coalesce(kling_generation_count, 0) = 0
    and kling_task_id is null
  returning id into claimed_id;

  return claimed_id is not null;
end;
$$;

revoke all on function public.claim_kling_video_generation(uuid) from public;
revoke all on function public.claim_kling_video_generation(uuid) from anon;
revoke all on function public.claim_kling_video_generation(uuid) from authenticated;
grant execute on function public.claim_kling_video_generation(uuid) to service_role;

-- Reuse Spreelo's existing public video bucket. Kling output URLs are temporary,
-- so the finalizer copies every completed MP4 here immediately.
insert into storage.buckets (id, name, public)
values ('post-videos', 'post-videos', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Public can view post videos" on storage.objects;
create policy "Public can view post videos"
on storage.objects
for select
to public
using (bucket_id = 'post-videos');

-- Expose the new generator as a normal selectable content type. v144.07 keeps
-- it out of automatic plan recipes intentionally; it can be selected manually.
insert into public.content_format_library (
  content_type_id,
  icon_name,
  display_label,
  description,
  category,
  is_featured,
  active,
  sort_order,
  customer_credit_cost,
  estimated_cost_sek,
  available_starter,
  available_growth,
  available_pro,
  is_custom,
  updated_at
)
values (
  'ai_product_video',
  'Clapperboard',
  'AI product video',
  'Turn one verified product image into a product-safe 9:16 AI video with an attention-grabbing, product-specific concept.',
  'video',
  true,
  true,
  35,
  50,
  5.0000,
  true,
  true,
  true,
  false,
  now()
)
on conflict (content_type_id) do update set
  icon_name = excluded.icon_name,
  display_label = excluded.display_label,
  description = excluded.description,
  category = excluded.category,
  is_featured = excluded.is_featured,
  active = excluded.active,
  sort_order = excluded.sort_order,
  customer_credit_cost = excluded.customer_credit_cost,
  estimated_cost_sek = coalesce(content_format_library.estimated_cost_sek, excluded.estimated_cost_sek),
  available_starter = excluded.available_starter,
  available_growth = excluded.available_growth,
  available_pro = excluded.available_pro,
  is_custom = false,
  updated_at = now();

comment on column public.posts.kling_generation_count is
  'Hard v144.07 cost guard. 0 before provider submission and 1 forever after the one allowed Kling generation is claimed.';
comment on column public.posts.kling_task_id is
  'Kling provider task id. Finalization polls this exact task; it must never be replaced automatically.';
comment on function public.claim_kling_video_generation(uuid) is
  'Atomically reserves the one and only Kling generation allowed for a Spreelo post.';
