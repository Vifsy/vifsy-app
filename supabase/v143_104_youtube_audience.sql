begin;

alter table public.social_connections
  add column if not exists youtube_made_for_kids boolean not null default false;

comment on column public.social_connections.youtube_made_for_kids is
  'YouTube audience declaration used for videos uploaded by Spreelo. false = not made for kids, true = made for kids.';

commit;
