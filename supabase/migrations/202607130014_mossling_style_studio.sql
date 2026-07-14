-- Mossling Style Studio: modular appearances, permanent unlocks, and trusted saves.

alter table public.pets add column if not exists appearance jsonb not null default '{}'::jsonb;
alter table public.pets drop constraint if exists pets_appearance_object_check;
alter table public.pets add constraint pets_appearance_object_check check(jsonb_typeof(appearance)='object');

create table if not exists public.customization_definitions(
  id text primary key,
  species_id text not null references public.species,
  slot text not null check(slot in ('marking','hair','outfit','head')),
  label text not null,
  description text not null,
  icon text not null,
  asset_key text not null,
  layer_order integer not null,
  source_label text not null,
  starter boolean not null default false,
  reputation_required integer check(reputation_required is null or reputation_required>0),
  item_id text references public.item_definitions,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists customization_species_slot_label_idx on public.customization_definitions(species_id,slot,label);

create table if not exists public.profile_customization_unlocks(
  owner_id uuid not null references public.profiles on delete cascade,
  customization_id text not null references public.customization_definitions on delete cascade,
  source text not null default 'gameplay',
  unlocked_at timestamptz not null default now(),
  primary key(owner_id,customization_id)
);

insert into public.customization_definitions(id,species_id,slot,label,description,icon,asset_key,layer_order,source_label,starter,reputation_required,item_id) values
  ('mossling-marking-sunberry-speckles','mossling','marking','Sunberry Speckles','A warm scattering of berry-colored freckles.','🍓','pets/customization/mossling/layers/marking-sunberry-speckles.png',20,'Starter Salon style',true,null,null),
  ('mossling-hair-leafy-mohawk','mossling','hair','Leafy Mohawk','A bold crest of overlapping woodland leaves.','🌿','pets/customization/mossling/layers/hair-leafy-mohawk.png',30,'Starter Salon style',true,null,null),
  ('mossling-outfit-sunberry-tunic','mossling','outfit','Sunberry Tunic','A fitted woodland tunic stitched for a Mossling.','🧵','pets/customization/mossling/layers/outfit-sunberry-tunic.png',40,'Reach Reputation Level 2',false,2,null),
  ('mossling-head-sunhat','mossling','head','Sunny Day Hat','A cheerful sunhat fitted above Mossling ears and crests.','👒','pets/customization/mossling/layers/head-sunny-day-hat.png',50,'Own Sunny Day Hat',false,null,'item-16')
on conflict(id) do update set
  species_id=excluded.species_id,slot=excluded.slot,label=excluded.label,description=excluded.description,
  icon=excluded.icon,asset_key=excluded.asset_key,layer_order=excluded.layer_order,source_label=excluded.source_label,
  starter=excluded.starter,reputation_required=excluded.reputation_required,item_id=excluded.item_id,active=true;

alter table public.customization_definitions enable row level security;
alter table public.profile_customization_unlocks enable row level security;
drop policy if exists "customization catalog read" on public.customization_definitions;
create policy "customization catalog read" on public.customization_definitions for select using(active);
drop policy if exists "own customization unlocks read" on public.profile_customization_unlocks;
create policy "own customization unlocks read" on public.profile_customization_unlocks for select using(owner_id=auth.uid());

create or replace function public.customization_is_unlocked(p_owner uuid,p_customization text) returns boolean
language sql stable security definer set search_path=public as $$
  select coalesce((
    select d.active and (
      d.starter
      or (d.reputation_required is not null and (select reputation_level from profiles where id=p_owner)>=d.reputation_required)
      or exists(select 1 from profile_customization_unlocks u where u.owner_id=p_owner and u.customization_id=d.id)
      or (d.item_id is not null and exists(select 1 from inventory_stacks i where i.owner_id=p_owner and i.item_id=d.item_id and i.quantity>0))
    ) from customization_definitions d where d.id=p_customization
  ),false)
$$;
revoke execute on function public.customization_is_unlocked(uuid,text) from public,anon,authenticated;

create or replace function public.get_customization_catalog(p_pet uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); pet_species text; result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select species_id into pet_species from pets where id=p_pet and owner_id=owner;
  if pet_species is null then raise exception 'pet_not_found'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',d.id,'unlocked',customization_is_unlocked(owner,d.id),'source',d.source_label
  ) order by d.layer_order,d.label),'[]'::jsonb) into result
  from customization_definitions d where d.species_id=pet_species and d.active;
  return result;
end $$;
revoke execute on function public.get_customization_catalog(uuid) from public,anon;
grant execute on function public.get_customization_catalog(uuid) to authenticated;

create or replace function public.save_pet_customization(p_pet uuid,p_palette integer,p_appearance jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); pet_species text; palette_key text; result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_appearance is null or jsonb_typeof(p_appearance)<>'object' then raise exception 'invalid_appearance'; end if;
  if exists(select 1 from jsonb_object_keys(p_appearance) as slots(slot) where slot not in ('marking','hair','outfit','head')) then raise exception 'invalid_customization_slot'; end if;
  select species_id into pet_species from pets where id=p_pet and owner_id=owner for update;
  if pet_species is null then raise exception 'pet_not_found'; end if;
  palette_key:=pet_species||'-'||(p_palette+1);
  if not exists(select 1 from palettes where id=palette_key and species_id=pet_species) then raise exception 'invalid_palette'; end if;
  if exists(
    select 1 from jsonb_each_text(p_appearance) choice
    left join customization_definitions d on d.id=choice.value and d.species_id=pet_species and d.slot=choice.key and d.active
    where d.id is null or not customization_is_unlocked(owner,d.id)
  ) then raise exception 'customization_locked_or_incompatible'; end if;
  update pets set palette_id=palette_key,appearance=p_appearance where id=p_pet and owner_id=owner;
  select jsonb_build_object('palette',p_palette,'appearance',p_appearance) into result;
  return result;
end $$;
revoke execute on function public.save_pet_customization(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_pet_customization(uuid,integer,jsonb) to authenticated;

drop function if exists public.complete_onboarding(text,text,text,integer);
drop function if exists public.complete_onboarding(text,text,text,integer,text,text);
create or replace function public.complete_onboarding(
  p_username text,p_pet_name text,p_species text,p_palette integer,p_pronouns text,p_appearance jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); pet_id uuid; palette_key text:=p_species||'-'||(p_palette+1);
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'invalid_username'; end if;
  if p_pronouns not in ('they/them','she/her','he/him') then raise exception 'invalid_pronouns'; end if;
  if p_appearance is null or jsonb_typeof(p_appearance)<>'object' then raise exception 'invalid_appearance'; end if;
  if not exists(select 1 from species where id=p_species) or not exists(select 1 from palettes where id=palette_key and species_id=p_species) then raise exception 'invalid_pet'; end if;
  if exists(select 1 from pets where owner_id=owner) then raise exception 'onboarding_complete'; end if;
  if exists(
    select 1 from jsonb_each_text(p_appearance) choice
    left join customization_definitions d on d.id=choice.value and d.species_id=p_species and d.slot=choice.key and d.active and d.starter
    where choice.key not in ('marking','hair','outfit','head') or d.id is null
  ) then raise exception 'invalid_starter_customization'; end if;
  update profiles set username=p_username,age_confirmed_at=now() where id=owner;
  insert into pets(owner_id,species_id,palette_id,name,pronouns,appearance)
  values(owner,p_species,palette_key,p_pet_name,p_pronouns,p_appearance) returning id into pet_id;
  update profiles set active_pet_id=pet_id where id=owner;
  perform adjust_inventory(owner,'item-1',2); perform adjust_inventory(owner,'item-6',1);
  perform adjust_inventory(owner,'item-10',4); perform adjust_inventory(owner,'item-11',3);
  perform adjust_inventory(owner,'item-13',2); perform adjust_inventory(owner,'item-14',2);
  return pet_id;
end $$;
revoke execute on function public.complete_onboarding(text,text,text,integer,text,jsonb) from public,anon;
grant execute on function public.complete_onboarding(text,text,text,integer,text,jsonb) to authenticated;

create or replace function public.get_pet_companions() returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'species_id',p.species_id,
    'palette',greatest(0,right(p.palette_id,1)::integer-1),'pronouns',p.pronouns,
    'hunger',greatest(20,p.hunger-floor(extract(epoch from (now()-p.needs_updated_at))/3600)::integer),
    'mood',greatest(20,p.mood-floor(extract(epoch from (now()-p.needs_updated_at))/7200)::integer),
    'cleanliness',greatest(20,p.cleanliness-floor(extract(epoch from (now()-p.needs_updated_at))/10800)::integer),
    'equipped',p.equipped,'appearance',p.appearance
  ) order by p.created_at),'[]'::jsonb) into result from pets p where p.owner_id=owner;
  return result;
end $$;
grant execute on function public.get_pet_companions() to authenticated;

create or replace function public.get_public_keeper_profile(p_username text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare keeper profiles; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into keeper from profiles where lower(username)=lower(trim(p_username));
  if keeper.id is null then raise exception 'keeper_not_found'; end if;
  select jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,
    'active_pet',case when pet.id is null then null else jsonb_build_object('id',pet.id,'name',pet.name,'species_id',pet.species_id,'palette',greatest(0,right(pet.palette_id,1)::integer-1),'pronouns',pet.pronouns,'hunger',greatest(20,pet.hunger-floor(extract(epoch from (now()-pet.needs_updated_at))/3600)::integer),'mood',greatest(20,pet.mood-floor(extract(epoch from (now()-pet.needs_updated_at))/7200)::integer),'cleanliness',greatest(20,pet.cleanliness-floor(extract(epoch from (now()-pet.needs_updated_at))/10800)::integer),'equipped',pet.equipped,'appearance',pet.appearance) end,
    'collected',coalesce((select jsonb_agg(entry.item_id order by entry.discovered_at desc) from (select item_id,discovered_at from collection_entries where owner_id=keeper.id order by discovered_at desc limit 6) entry),'[]'::jsonb),
    'wishlist',coalesce((select jsonb_agg(w.item_id order by w.created_at desc) from wishlists w where w.owner_id=keeper.id),'[]'::jsonb),
    'friend_count',(select count(*) from friendships f where f.status='accepted' and keeper.id in(f.requester_id,f.addressee_id)),
    'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'icon',b.icon,'description',b.description,'earned_at',pb.earned_at) order by pb.earned_at) from profile_expedition_badges pb join expedition_badges b on b.id=pb.badge_id where pb.owner_id=keeper.id),'[]'::jsonb)
  ) into result from pets pet where pet.id=keeper.active_pet_id;
  if result is null then result:=jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,'active_pet',null,'collected','[]'::jsonb,'wishlist','[]'::jsonb,'friend_count',0,'badges','[]'::jsonb); end if;
  return result;
end $$;
grant execute on function public.get_public_keeper_profile(text) to authenticated;

alter table public.pets drop constraint if exists pets_variant_check;
alter table public.pets drop column if exists variant;
