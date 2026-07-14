-- Allow Auth user deletion to cascade through ordinary game data while
-- preserving moderation evidence without retaining deleted profile IDs.

alter table public.market_listings
  drop constraint if exists market_listings_seller_id_fkey,
  drop constraint if exists market_listings_buyer_id_fkey;

alter table public.market_listings
  add constraint market_listings_seller_id_fkey
    foreign key (seller_id) references public.profiles(id) on delete cascade,
  add constraint market_listings_buyer_id_fkey
    foreign key (buyer_id) references public.profiles(id) on delete set null;

alter table public.reports
  alter column reporter_id drop not null;

alter table public.reports
  drop constraint if exists reports_reporter_id_fkey,
  drop constraint if exists reports_message_id_fkey,
  drop constraint if exists reports_subject_id_fkey;

alter table public.reports
  add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles(id) on delete set null,
  add constraint reports_message_id_fkey
    foreign key (message_id) references public.messages(id) on delete set null,
  add constraint reports_subject_id_fkey
    foreign key (subject_id) references public.profiles(id) on delete set null;

alter table public.moderation_actions
  alter column moderator_id drop not null,
  alter column subject_id drop not null;

alter table public.moderation_actions
  drop constraint if exists moderation_actions_moderator_id_fkey,
  drop constraint if exists moderation_actions_subject_id_fkey;

alter table public.moderation_actions
  add constraint moderation_actions_moderator_id_fkey
    foreign key (moderator_id) references public.profiles(id) on delete set null,
  add constraint moderation_actions_subject_id_fkey
    foreign key (subject_id) references public.profiles(id) on delete set null;
