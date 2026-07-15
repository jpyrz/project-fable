-- Tie arcade play to companion progression and promote backgrounds into the
-- same trusted Style Studio system used by fitted traits and wearables.

alter table public.pets add column if not exists bond_xp integer not null default 0;
alter table public.pets drop constraint if exists pets_bond_xp_check;
alter table public.pets add constraint pets_bond_xp_check check (bond_xp >= 0);

alter table public.customization_definitions alter column species_id drop not null;
alter table public.customization_definitions drop constraint if exists customization_definitions_slot_check;
alter table public.customization_definitions add constraint customization_definitions_slot_check
  check (slot in ('background','marking','hair','outfit','head'));

insert into public.customization_definitions
  (id,species_id,slot,label,description,icon,asset_key,layer_order,source_label,starter,reputation_required,item_id)
values
  ('background-garden',null,'background','Garden Backdrop','A sunny flower garden in full bloom.','🌼','items/backgrounds/garden-backdrop.svg',0,'Own Garden Backdrop',false,null,'item-22'),
  ('background-twilight',null,'background','Twilight Backdrop','A violet evening filled with sleepy stars.','🌙','items/backgrounds/twilight-backdrop.svg',0,'Own Twilight Backdrop',false,null,'item-23'),
  ('background-river',null,'background','River Backdrop','A bright riverside with soft rolling hills.','🏞️','items/backgrounds/river-backdrop.svg',0,'Own River Backdrop',false,null,'item-24'),
  ('background-moonroot-sky',null,'background','Moonroot Sky','A rare crystal cavern glowing under a moonlit sky.','🌌','items/backgrounds/moonroot-sky.svg',0,'Own Moonroot Sky',false,null,'item-120')
on conflict(id) do update set species_id=excluded.species_id,slot=excluded.slot,label=excluded.label,
  description=excluded.description,icon=excluded.icon,asset_key=excluded.asset_key,layer_order=excluded.layer_order,
  source_label=excluded.source_label,starter=excluded.starter,reputation_required=excluded.reputation_required,
  item_id=excluded.item_id,active=true;

-- The first scene is a launch keepsake, making the new system immediately
-- testable while the other backgrounds remain collection goals.
insert into public.inventory_stacks(owner_id,item_id,quantity)
select id,'item-22',1 from public.profiles
on conflict(owner_id,item_id) do update set quantity=greatest(inventory_stacks.quantity,1),updated_at=now();
insert into public.collection_entries(owner_id,item_id)
select id,'item-22' from public.profiles on conflict do nothing;

create or replace function public.grant_starter_background() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into inventory_stacks(owner_id,item_id,quantity) values(new.owner_id,'item-22',1)
  on conflict(owner_id,item_id) do update set quantity=greatest(inventory_stacks.quantity,1),updated_at=now();
  insert into collection_entries(owner_id,item_id) values(new.owner_id,'item-22') on conflict do nothing;
  return new;
end $$;
drop trigger if exists grant_starter_background_after_pet on public.pets;
create trigger grant_starter_background_after_pet after insert on public.pets
for each row execute function public.grant_starter_background();

update public.pets set
  appearance=jsonb_set(appearance,'{background}',to_jsonb(case equipped->>'background'
    when 'item-22' then 'background-garden' when 'item-23' then 'background-twilight'
    when 'item-24' then 'background-river' when 'item-120' then 'background-moonroot-sky' end)),
  equipped=equipped-'background'
where equipped->>'background' in ('item-22','item-23','item-24','item-120');

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
  from customization_definitions d
  where (d.species_id=pet_species or d.species_id is null) and d.active;
  return result;
end $$;

create or replace function public.save_pet_customization(p_pet uuid,p_palette integer,p_appearance jsonb) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); pet_species text; palette_key text; result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_appearance is null or jsonb_typeof(p_appearance)<>'object' then raise exception 'invalid_appearance'; end if;
  if exists(select 1 from jsonb_object_keys(p_appearance) as slots(slot) where slot not in ('background','marking','hair','outfit','head')) then raise exception 'invalid_customization_slot'; end if;
  select species_id into pet_species from pets where id=p_pet and owner_id=owner for update;
  if pet_species is null then raise exception 'pet_not_found'; end if;
  palette_key:=pet_species||'-'||(p_palette+1);
  if not exists(select 1 from palettes where id=palette_key and species_id=pet_species) then raise exception 'invalid_palette'; end if;
  if exists(
    select 1 from jsonb_each_text(p_appearance) choice
    left join customization_definitions d on d.id=choice.value
      and (d.species_id=pet_species or d.species_id is null)
      and d.slot=choice.key and d.active
    where d.id is null or not customization_is_unlocked(owner,d.id)
  ) then raise exception 'customization_locked_or_incompatible'; end if;
  update pets set palette_id=palette_key,appearance=p_appearance where id=p_pet and owner_id=owner;
  select jsonb_build_object('palette',p_palette,'appearance',p_appearance) into result;
  return result;
end $$;

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
    'bond_xp',p.bond_xp,'equipped',p.equipped,'appearance',p.appearance
  ) order by p.created_at),'[]'::jsonb) into result from pets p where p.owner_id=owner;
  return result;
end $$;

create or replace function public.care_pet(p_pet uuid,p_kind text) returns public.pets
language plpgsql security definer set search_path=public as $$
declare result pets; elapsed_seconds numeric;
begin
  if p_kind <> 'groom' then raise exception 'play_in_arcade_or_choose_food'; end if;
  select extract(epoch from (now()-needs_updated_at)) into elapsed_seconds
  from pets where id=p_pet and owner_id=auth.uid() for update;
  if elapsed_seconds is null then raise exception 'pet_not_found'; end if;
  update pets set
    hunger=least(100,greatest(20,hunger-floor(elapsed_seconds/3600)::integer)+3),
    mood=least(100,greatest(20,mood-floor(elapsed_seconds/7200)::integer)+4),
    cleanliness=least(100,greatest(20,cleanliness-floor(elapsed_seconds/10800)::integer)+20),
    needs_updated_at=now()
  where id=p_pet and owner_id=auth.uid() returning * into result;
  perform increment_daily_task(auth.uid(),'care',1);
  return result;
end $$;

create or replace function public.submit_game_run(p_run uuid,p_score integer,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  v_run public.game_runs%rowtype;
  v_elapsed numeric; v_minimum_elapsed numeric; v_reward integer; v_joy integer;
  v_bond_xp integer; v_suspicious boolean; v_result jsonb; v_material text;
begin
  if exists(select 1 from idempotency_keys ik where ik.owner_id=auth.uid() and ik.key=p_idempotency_key) then
    return (select ik.result from idempotency_keys ik where ik.owner_id=auth.uid() and ik.key=p_idempotency_key);
  end if;
  select gr.* into v_run from game_runs gr where gr.id=p_run and gr.owner_id=auth.uid() for update;
  if v_run.id is null or v_run.finished_at is not null then raise exception 'invalid_run'; end if;
  v_elapsed:=extract(epoch from now()-v_run.started_at);
  v_minimum_elapsed:=case when v_run.game_id='bloom-match' and p_score=300 then 3 else 20 end;
  v_suspicious:=v_elapsed<v_minimum_elapsed or v_elapsed>180 or p_score<0 or p_score>2000;
  v_reward:=case when v_suspicious then 0 else least(90,greatest(10,floor(p_score/3))) end;
  v_joy:=case when v_suspicious then 0 else 12 end;
  v_bond_xp:=case when v_suspicious then 0 else least(16,8+floor(p_score/100)::integer*2) end;
  v_material:=case when mod(p_score,2)=0 then 'item-10' else 'item-11' end;

  update game_runs set finished_at=now(),score=p_score,reward=v_reward,suspicious=v_suspicious where id=p_run;
  if v_reward>0 then
    update wallets set balance=balance+v_reward,updated_at=now() where owner_id=auth.uid();
    insert into currency_ledger(owner_id,amount,reason,correlation_id) values(auth.uid(),v_reward,'game_reward',p_idempotency_key);
    update profiles set reputation_xp=reputation_xp+8,reputation_level=greatest(reputation_level,floor((reputation_xp+8)/100)+1) where id=auth.uid();
    update pets p set
      hunger=greatest(20,p.hunger-floor(extract(epoch from (now()-p.needs_updated_at))/3600)::integer),
      mood=least(100,greatest(20,p.mood-floor(extract(epoch from (now()-p.needs_updated_at))/7200)::integer)+v_joy),
      cleanliness=greatest(20,p.cleanliness-floor(extract(epoch from (now()-p.needs_updated_at))/10800)::integer),
      bond_xp=p.bond_xp+v_bond_xp,needs_updated_at=now()
    where p.id=(select active_pet_id from profiles where id=auth.uid()) and p.owner_id=auth.uid();
    perform adjust_inventory(auth.uid(),v_material,1);
    perform increment_daily_task(auth.uid(),'play',1);
    perform increment_daily_task(auth.uid(),'collect',1);
  end if;
  v_result:=jsonb_build_object('score',p_score,'reward',v_reward,'joy',v_joy,'bond_xp',v_bond_xp,
    'suspicious',v_suspicious,'item_id',case when v_reward>0 then v_material else null end);
  insert into idempotency_keys(owner_id,key,operation,result) values(auth.uid(),p_idempotency_key,'submit_game_run',v_result);
  return v_result;
end $$;

create or replace function public.get_public_keeper_profile(p_username text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare keeper profiles; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into keeper from profiles where lower(username)=lower(trim(p_username));
  if keeper.id is null then raise exception 'keeper_not_found'; end if;
  select jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,
    'active_pet',case when pet.id is null then null else jsonb_build_object('id',pet.id,'name',pet.name,'species_id',pet.species_id,'palette',greatest(0,right(pet.palette_id,1)::integer-1),'pronouns',pet.pronouns,'hunger',greatest(20,pet.hunger-floor(extract(epoch from (now()-pet.needs_updated_at))/3600)::integer),'mood',greatest(20,pet.mood-floor(extract(epoch from (now()-pet.needs_updated_at))/7200)::integer),'cleanliness',greatest(20,pet.cleanliness-floor(extract(epoch from (now()-pet.needs_updated_at))/10800)::integer),'bond_xp',pet.bond_xp,'equipped',pet.equipped,'appearance',pet.appearance) end,
    'collected',coalesce((select jsonb_agg(entry.item_id order by entry.discovered_at desc) from (select item_id,discovered_at from collection_entries where owner_id=keeper.id order by discovered_at desc limit 6) entry),'[]'::jsonb),
    'wishlist',coalesce((select jsonb_agg(w.item_id order by w.created_at desc) from wishlists w where w.owner_id=keeper.id),'[]'::jsonb),
    'friend_count',(select count(*) from friendships f where f.status='accepted' and keeper.id in(f.requester_id,f.addressee_id)),
    'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'icon',b.icon,'description',b.description,'earned_at',pb.earned_at) order by pb.earned_at) from profile_expedition_badges pb join expedition_badges b on b.id=pb.badge_id where pb.owner_id=keeper.id),'[]'::jsonb)
  ) into result from pets pet where pet.id=keeper.active_pet_id;
  if result is null then result:=jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,'active_pet',null,'collected','[]'::jsonb,'wishlist','[]'::jsonb,'friend_count',0,'badges','[]'::jsonb); end if;
  return result;
end $$;

revoke execute on function public.get_customization_catalog(uuid) from public,anon;
grant execute on function public.get_customization_catalog(uuid) to authenticated;
revoke execute on function public.save_pet_customization(uuid,integer,jsonb) from public,anon;
grant execute on function public.save_pet_customization(uuid,integer,jsonb) to authenticated;
grant execute on function public.get_pet_companions() to authenticated;
grant execute on function public.care_pet(uuid,text) to authenticated;
grant execute on function public.submit_game_run(uuid,integer,uuid) to authenticated;
grant execute on function public.get_public_keeper_profile(text) to authenticated;
