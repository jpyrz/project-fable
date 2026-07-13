-- Engagement pass: meaningful daily care, inventory-backed feeding, and safe public profiles.

create or replace function public.get_pet_companions() returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'species_id',p.species_id,
    'palette',greatest(0,right(p.palette_id,1)::integer-1),
    'variant',p.variant,'pronouns',p.pronouns,
    'hunger',greatest(20,p.hunger-floor(extract(epoch from (now()-p.needs_updated_at))/3600)::integer),
    'mood',greatest(20,p.mood-floor(extract(epoch from (now()-p.needs_updated_at))/7200)::integer),
    'cleanliness',greatest(20,p.cleanliness-floor(extract(epoch from (now()-p.needs_updated_at))/10800)::integer),
    'equipped',p.equipped
  ) order by p.created_at),'[]'::jsonb) into result
  from pets p where p.owner_id=owner;
  return result;
end $$;
grant execute on function public.get_pet_companions() to authenticated;

create or replace function public.care_pet(p_pet uuid,p_kind text) returns public.pets
language plpgsql security definer set search_path=public as $$
declare result pets; elapsed_seconds numeric;
begin
  if p_kind not in ('groom','play') then
    if p_kind='food' then raise exception 'choose_food_from_bag'; end if;
    raise exception 'invalid_care_kind';
  end if;
  select extract(epoch from (now()-needs_updated_at)) into elapsed_seconds
  from pets where id=p_pet and owner_id=auth.uid() for update;
  if elapsed_seconds is null then raise exception 'pet_not_found'; end if;
  update pets set
    hunger=least(100,greatest(20,hunger-floor(elapsed_seconds/3600)::integer)+3),
    mood=least(100,greatest(20,mood-floor(elapsed_seconds/7200)::integer)+case when p_kind='play' then 18 else 4 end),
    cleanliness=least(100,greatest(20,cleanliness-floor(elapsed_seconds/10800)::integer)+case when p_kind='groom' then 20 else 2 end),
    needs_updated_at=now()
  where id=p_pet and owner_id=auth.uid() returning * into result;
  perform increment_daily_task(auth.uid(),'care',1);
  return result;
end $$;
grant execute on function public.care_pet(uuid,text) to authenticated;

create or replace function public.feed_pet(p_pet uuid,p_item text) returns public.pets
language plpgsql security definer set search_path=public as $$
declare
  owner uuid:=auth.uid();
  result pets;
  food_item item_definitions;
  elapsed_seconds numeric;
  current_hunger integer;
  hunger_boost integer;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select * into food_item from item_definitions where id=p_item and category='food' and active;
  if food_item.id is null then raise exception 'invalid_food'; end if;

  select * into result from pets where id=p_pet and owner_id=owner for update;
  if result.id is null then raise exception 'pet_not_found'; end if;
  elapsed_seconds:=extract(epoch from (now()-result.needs_updated_at));

  current_hunger:=greatest(20,result.hunger-floor(elapsed_seconds/3600)::integer);
  if current_hunger>=100 then raise exception 'pet_is_full'; end if;
  hunger_boost:=case food_item.rarity::text
    when 'common' then 18 when 'uncommon' then 24 when 'rare' then 30 else 38 end;

  perform adjust_inventory(owner,p_item,-1);
  update pets set
    hunger=least(100,current_hunger+hunger_boost),
    mood=least(100,greatest(20,mood-floor(elapsed_seconds/7200)::integer)+2),
    cleanliness=greatest(20,cleanliness-floor(elapsed_seconds/10800)::integer),
    needs_updated_at=now()
  where id=p_pet and owner_id=owner returning * into result;
  perform increment_daily_task(owner,'care',1);
  return result;
end $$;
revoke execute on function public.feed_pet(uuid,text) from public,anon;
grant execute on function public.feed_pet(uuid,text) to authenticated;

create or replace function public.get_public_keeper_profile(p_username text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare keeper profiles; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into keeper from profiles where lower(username)=lower(trim(p_username));
  if keeper.id is null then raise exception 'keeper_not_found'; end if;

  select jsonb_build_object(
    'username',keeper.username,
    'reputation',keeper.reputation_level,
    'reputation_xp',keeper.reputation_xp,
    'active_pet',case when pet.id is null then null else jsonb_build_object(
      'id',pet.id,'name',pet.name,'species_id',pet.species_id,
      'palette',greatest(0,right(pet.palette_id,1)::integer-1),
      'variant',pet.variant,'pronouns',pet.pronouns,
      'hunger',greatest(20,pet.hunger-floor(extract(epoch from (now()-pet.needs_updated_at))/3600)::integer),
      'mood',greatest(20,pet.mood-floor(extract(epoch from (now()-pet.needs_updated_at))/7200)::integer),
      'cleanliness',greatest(20,pet.cleanliness-floor(extract(epoch from (now()-pet.needs_updated_at))/10800)::integer),
      'equipped',pet.equipped
    ) end,
    'collected',coalesce((select jsonb_agg(entry.item_id order by entry.discovered_at desc) from (select item_id,discovered_at from collection_entries where owner_id=keeper.id order by discovered_at desc limit 6) entry),'[]'::jsonb),
    'wishlist',coalesce((select jsonb_agg(w.item_id order by w.created_at desc) from wishlists w where w.owner_id=keeper.id limit 6),'[]'::jsonb),
    'friend_count',(select count(*) from friendships f where f.status='accepted' and keeper.id in (f.requester_id,f.addressee_id))
  ) into result
  from pets pet where pet.id=keeper.active_pet_id;

  if result is null then
    result:=jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,'active_pet',null,'collected','[]'::jsonb,'wishlist','[]'::jsonb,'friend_count',0);
  end if;
  return result;
end $$;
revoke execute on function public.get_public_keeper_profile(text) from public,anon;
grant execute on function public.get_public_keeper_profile(text) to authenticated;
