-- Expand Companion Expeditions into a three-region collection and weekly loop.

update public.item_definitions set name='Sunberry Seedpod',category='material',rarity='uncommon',icon='🍓',description='A warm little seedpod gathered in Sunberry Glen.',base_price=72 where id='item-109';
update public.item_definitions set name='Lantern Clover',category='material',rarity='uncommon',icon='🍀',description='Clover that glows softly beneath the glen fireflies.',base_price=78 where id='item-110';
update public.item_definitions set name='Willow Whisper',category='collectible',rarity='rare',icon='🍃',description='A rare leaf that seems to remember an old woodland song.',base_price=0 where id='item-111';
update public.item_definitions set name='Glen Garland',category='accessory',rarity='rare',icon='🌼',description='A cheerful garland crafted from Sunberry Glen discoveries.',base_price=0 where id='item-112';
update public.item_definitions set name='Mistbell Reed',category='material',rarity='uncommon',icon='🎋',description='A musical marsh reed with a silvery ring.',base_price=78 where id='item-113';
update public.item_definitions set name='Dewglass Pearl',category='material',rarity='uncommon',icon='🫧',description='A pearly bead of mist hardened by moonlight.',base_price=84 where id='item-114';
update public.item_definitions set name='Fogfin Charm',category='collectible',rarity='rare',icon='🐟',description='A tiny charm left behind by a shy marsh swimmer.',base_price=0 where id='item-115';
update public.item_definitions set name='Marshlight Brooch',category='accessory',rarity='rare',icon='🪷',description='A luminous brooch crafted from Mistbell Marsh finds.',base_price=0 where id='item-116';
update public.item_definitions set name='Moonroot Crystal',category='material',rarity='uncommon',icon='🔮',description='A violet crystal grown around an ancient moonroot.',base_price=88 where id='item-117';
update public.item_definitions set name='Echo Geode',category='material',rarity='uncommon',icon='🪨',description='A geode that quietly repeats happy sounds.',base_price=94 where id='item-118';
update public.item_definitions set name='Cave Star',category='collectible',rarity='rare',icon='🌟',description='A rare fallen star found in the deepest cavern pocket.',base_price=0 where id='item-119';
update public.item_definitions set name='Moonroot Sky',category='background',rarity='mythic',icon='🌌',description='A dreamy cavern sky crafted from Moonroot discoveries.',base_price=0 where id='item-120';

insert into public.recipes(id,output_item_id,reputation_required,active) values
  ('glen-garland','item-112',1,true),
  ('marshlight-brooch','item-116',2,true),
  ('moonroot-sky','item-120',3,true)
on conflict(id) do update set output_item_id=excluded.output_item_id,reputation_required=excluded.reputation_required,active=true;
insert into public.recipe_ingredients(recipe_id,item_id,quantity) values
  ('glen-garland','item-109',2),('glen-garland','item-110',1),
  ('marshlight-brooch','item-113',2),('marshlight-brooch','item-114',1),
  ('moonroot-sky','item-117',2),('moonroot-sky','item-118',1)
on conflict(recipe_id,item_id) do update set quantity=excluded.quantity;

alter table public.companion_expeditions drop constraint if exists companion_expeditions_location_check;
alter table public.companion_expeditions add constraint companion_expeditions_location_check
  check(location in ('sunberry-glen','mistbell-marsh','moonroot-caverns'));
alter table public.companion_expeditions drop constraint if exists companion_expeditions_choice_check;
alter table public.companion_expeditions add constraint companion_expeditions_choice_check
  check(choice is null or choice in ('follow-glow','gather-grove','path-a','path-b'));
alter table public.companion_expeditions add column if not exists scene_id integer not null default 0 check(scene_id between 0 and 2);
alter table public.companion_expeditions add column if not exists affinity boolean not null default false;

create table if not exists public.expedition_badges(
  id text primary key,
  label text unique not null,
  icon text not null,
  description text not null,
  location text unique not null,
  requirements text[] not null
);
create table if not exists public.profile_expedition_badges(
  owner_id uuid not null references public.profiles on delete cascade,
  badge_id text not null references public.expedition_badges on delete cascade,
  earned_at timestamptz not null default now(),
  primary key(owner_id,badge_id)
);
insert into public.expedition_badges(id,label,icon,description,location,requirements) values
  ('glen-guide','Glen Guide','🌼','Completed the Sunberry Glen collection.','sunberry-glen',array['item-109','item-110','item-111','item-112']),
  ('mist-walker','Mist Walker','🪷','Completed the Mistbell Marsh collection.','mistbell-marsh',array['item-113','item-114','item-115','item-116']),
  ('moonroot-seeker','Moonroot Seeker','🌟','Completed the Moonroot Caverns collection.','moonroot-caverns',array['item-117','item-118','item-119','item-120'])
on conflict(id) do update set label=excluded.label,icon=excluded.icon,description=excluded.description,location=excluded.location,requirements=excluded.requirements;

alter table public.expedition_badges enable row level security;
alter table public.profile_expedition_badges enable row level security;
drop policy if exists "badge catalog read" on public.expedition_badges;
create policy "badge catalog read" on public.expedition_badges for select using(true);
drop policy if exists "public earned badges read" on public.profile_expedition_badges;
create policy "public earned badges read" on public.profile_expedition_badges for select using(true);

create table if not exists public.weekly_expedition_progress(
  owner_id uuid not null references public.profiles on delete cascade,
  week_start date not null,
  completed integer not null default 0 check(completed>=0),
  discoveries text[] not null default '{}',
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key(owner_id,week_start)
);
alter table public.weekly_expedition_progress enable row level security;
drop policy if exists "own weekly expedition read" on public.weekly_expedition_progress;
create policy "own weekly expedition read" on public.weekly_expedition_progress for select using(owner_id=auth.uid());

create or replace function public.current_expedition_week() returns date
language sql stable set search_path=public as $$
  select date_trunc('week',now() at time zone 'utc')::date
$$;
revoke execute on function public.current_expedition_week() from public,anon;
grant execute on function public.current_expedition_week() to authenticated;

create or replace function public.award_expedition_badges(p_owner uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare badge expedition_badges; awarded jsonb:=null;
begin
  for badge in select * from expedition_badges loop
    if not exists(select 1 from profile_expedition_badges where owner_id=p_owner and badge_id=badge.id)
      and not exists(
        select 1 from unnest(badge.requirements) required_item
        where not exists(select 1 from collection_entries c where c.owner_id=p_owner and c.item_id=required_item)
      ) then
      insert into profile_expedition_badges(owner_id,badge_id) values(p_owner,badge.id);
      awarded:=jsonb_build_object('id',badge.id,'label',badge.label,'icon',badge.icon,'description',badge.description,'earned_at',now());
      insert into notifications(owner_id,kind,body) values(p_owner,'expedition_badge','New badge earned: '||badge.label||'!');
    end if;
  end loop;
  return awarded;
end $$;
revoke execute on function public.award_expedition_badges(uuid) from public,anon,authenticated;

create or replace function public.expedition_payload(p_expedition public.companion_expeditions) returns jsonb
language sql stable set search_path=public as $$
  select jsonb_build_object(
    'id',p_expedition.id,'location',p_expedition.location,'duration_minutes',p_expedition.duration_minutes,
    'pet_name',(select name from pets where id=p_expedition.pet_id),
    'species_id',(select species_id from pets where id=p_expedition.pet_id),
    'food_item_id',p_expedition.food_item_id,'food_trait',p_expedition.food_trait,
    'started_at',p_expedition.started_at,'returns_at',p_expedition.returns_at,'server_now',now(),
    'scene_id',p_expedition.scene_id,'affinity',p_expedition.affinity
  )
$$;
revoke execute on function public.expedition_payload(public.companion_expeditions) from public,anon,authenticated;

revoke execute on function public.start_expedition(uuid,integer,text) from authenticated;
create or replace function public.start_expedition(
  p_pet uuid,p_location text,p_duration integer,p_food text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); expedition companion_expeditions; selected_trait text; pet_species text; required_level integer; generated_seed bigint;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_duration not in (10,20,30) then raise exception 'invalid_duration'; end if;
  required_level:=case p_location when 'sunberry-glen' then 1 when 'mistbell-marsh' then 2 when 'moonroot-caverns' then 3 else 999 end;
  if (select reputation_level from profiles where id=owner)<required_level then raise exception 'location_locked'; end if;
  select species_id into pet_species from pets where id=p_pet and owner_id=owner;
  if pet_species is null or not exists(select 1 from profiles where id=owner and active_pet_id=p_pet) then raise exception 'active_pet_required'; end if;
  if exists(select 1 from companion_expeditions where owner_id=owner and claimed_at is null) then raise exception 'expedition_already_active'; end if;
  if p_food is not null then
    select food_trait into selected_trait from item_definitions where id=p_food and category='food' and active;
    if selected_trait is null then raise exception 'invalid_trail_snack'; end if;
    perform adjust_inventory(owner,p_food,-1);
  end if;
  generated_seed:=floor(random()*2147483647)::bigint;
  insert into companion_expeditions(owner_id,pet_id,location,duration_minutes,food_item_id,food_trait,seed,returns_at,scene_id,affinity)
  values(owner,p_pet,p_location,p_duration,p_food,selected_trait,generated_seed,now()+make_interval(mins=>p_duration),mod(generated_seed,3)::integer,
    (pet_species='mossling' and p_location='sunberry-glen') or (pet_species='cloudkip' and p_location='mistbell-marsh') or (pet_species='pebblit' and p_location='moonroot-caverns'))
  returning * into expedition;
  return expedition_payload(expedition);
end $$;
revoke execute on function public.start_expedition(uuid,text,integer,text) from public,anon;
grant execute on function public.start_expedition(uuid,text,integer,text) to authenticated;

create or replace function public.claim_expedition(p_expedition uuid,p_choice text,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  owner uuid:=auth.uid(); expedition companion_expeditions; coin_reward integer; reputation_reward integer;
  material_ids text[]; material_id text; material_quantity integer; rare_item_id text; rare_threshold integer;
  rare_found boolean:=false; reward_ids text[]; reward_items jsonb; reward_result jsonb; new_badge jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  if p_choice not in ('path-a','path-b') then raise exception 'invalid_expedition_choice'; end if;
  select * into expedition from companion_expeditions where id=p_expedition and owner_id=owner and claimed_at is null for update;
  if expedition.id is null then raise exception 'expedition_not_found'; end if;
  if now()<expedition.returns_at then raise exception 'expedition_not_ready'; end if;

  coin_reward:=case expedition.duration_minutes when 10 then 45 when 20 then 80 else 115 end;
  reputation_reward:=case expedition.duration_minutes when 10 then 12 when 20 then 18 else 25 end
    +case when expedition.food_trait='cozy' then 3 else 0 end+case when expedition.affinity then 2 else 0 end;
  material_ids:=case expedition.location when 'sunberry-glen' then array['item-109','item-110'] when 'mistbell-marsh' then array['item-113','item-114'] else array['item-117','item-118'] end;
  rare_item_id:=case expedition.location when 'sunberry-glen' then 'item-111' when 'mistbell-marsh' then 'item-115' else 'item-119' end;
  material_id:=material_ids[(mod(expedition.seed,2)+1)::integer];
  material_quantity:=case when p_choice='path-b' then 2 else 1 end+case when expedition.food_trait='keen' then 1 else 0 end;
  rare_threshold:=case expedition.duration_minutes when 10 then 20 when 20 then 25 else 30 end+case when expedition.food_trait='lucky' then 10 else 0 end+case when expedition.affinity then 5 else 0 end;
  rare_found:=p_choice='path-a' and mod(abs(expedition.seed),100)<rare_threshold;

  perform adjust_inventory(owner,material_id,material_quantity);
  reward_ids:=array[material_id];
  reward_items:=jsonb_build_array(jsonb_build_object('item_id',material_id,'quantity',material_quantity));
  if rare_found then perform adjust_inventory(owner,rare_item_id,1); reward_ids:=array_append(reward_ids,rare_item_id); reward_items:=reward_items||jsonb_build_array(jsonb_build_object('item_id',rare_item_id,'quantity',1)); end if;
  new_badge:=award_expedition_badges(owner);

  update wallets set balance=balance+coin_reward,updated_at=now() where owner_id=owner;
  update profiles set reputation_xp=reputation_xp+reputation_reward,reputation_level=greatest(reputation_level,floor((reputation_xp+reputation_reward)/100)+1) where id=owner;
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(owner,coin_reward,'expedition_reward',p_idempotency_key);
  perform increment_daily_task(owner,'collect',material_quantity+case when rare_found then 1 else 0 end);
  insert into weekly_expedition_progress(owner_id,week_start,completed,discoveries) values(owner,current_expedition_week(),1,reward_ids)
  on conflict(owner_id,week_start) do update set completed=weekly_expedition_progress.completed+1,
    discoveries=(select array_agg(distinct discovery) from unnest(weekly_expedition_progress.discoveries||excluded.discoveries) discovery),updated_at=now();

  reward_result:=jsonb_build_object('coins',coin_reward,'reputation',reputation_reward,'items',reward_items,'rare',rare_found,'badge',new_badge,
    'title',case when rare_found then 'A truly rare discovery!' when p_choice='path-b' then 'A basket of expedition treasures!' else 'The curious path shared a secret!' end,
    'detail',case when rare_found then 'A rare region treasure followed your companion home.' when p_choice='path-b' then 'Careful gathering uncovered useful crafting finds.' else 'Your companion followed their curiosity home with a new discovery.' end);
  update companion_expeditions set claimed_at=now(),choice=p_choice,result=reward_result where id=expedition.id;
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'claim_expedition',reward_result);
  insert into notifications(owner_id,kind,body) values(owner,'expedition_return',(select name from pets where id=expedition.pet_id)||' returned from '||initcap(replace(expedition.location,'-',' '))||'!');
  return reward_result;
end $$;
grant execute on function public.claim_expedition(uuid,text,uuid) to authenticated;

create or replace function public.get_expedition_journal() returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); result jsonb; week weekly_expedition_progress;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select * into week from weekly_expedition_progress where owner_id=owner and week_start=current_expedition_week();
  select jsonb_build_object(
    'collected',coalesce((select jsonb_agg(item_id order by item_id) from collection_entries where owner_id=owner and substring(item_id from 6)::integer between 109 and 120),'[]'::jsonb),
    'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'icon',b.icon,'description',b.description,'earned_at',pb.earned_at) order by pb.earned_at) from profile_expedition_badges pb join expedition_badges b on b.id=pb.badge_id where pb.owner_id=owner),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'location',e.location,'pet_name',p.name,'duration_minutes',e.duration_minutes,'choice',e.choice,'result',e.result,'claimed_at',e.claimed_at) order by e.claimed_at desc) from (select * from companion_expeditions where owner_id=owner and claimed_at is not null order by claimed_at desc limit 12) e join pets p on p.id=e.pet_id),'[]'::jsonb),
    'weekly',jsonb_build_object('completed',coalesce(week.completed,0),'unique_discoveries',coalesce(cardinality(week.discoveries),0),'target_completed',4,'target_discoveries',3,'claimed',week.claimed_at is not null,
      'reset_at',to_char((date_trunc('week',now() at time zone 'utc')+interval '7 days') at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'reward_coins',200,'reward_reputation',30)
  ) into result;
  return result;
end $$;
revoke execute on function public.get_expedition_journal() from public,anon;
grant execute on function public.get_expedition_journal() to authenticated;

create or replace function public.claim_weekly_expedition_goal(p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); week weekly_expedition_progress; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  select * into week from weekly_expedition_progress where owner_id=owner and week_start=current_expedition_week() for update;
  if week.owner_id is null or week.completed<4 or cardinality(week.discoveries)<3 or week.claimed_at is not null then raise exception 'weekly_goal_not_claimable'; end if;
  update weekly_expedition_progress set claimed_at=now(),updated_at=now() where owner_id=owner and week_start=week.week_start;
  update wallets set balance=balance+200,updated_at=now() where owner_id=owner;
  update profiles set reputation_xp=reputation_xp+30,reputation_level=greatest(reputation_level,floor((reputation_xp+30)/100)+1) where id=owner;
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(owner,200,'weekly_expedition',p_idempotency_key);
  result:=jsonb_build_object('coins',200,'reputation',30);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'claim_weekly_expedition_goal',result);
  insert into notifications(owner_id,kind,body) values(owner,'weekly_expedition','Weekly expedition goal complete!');
  return result;
end $$;
revoke execute on function public.claim_weekly_expedition_goal(uuid) from public,anon;
grant execute on function public.claim_weekly_expedition_goal(uuid) to authenticated;

create or replace function public.craft_item(p_recipe text,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); recipe recipes; ingredient record; result jsonb; new_badge jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  select * into recipe from recipes where id=p_recipe and active;
  if recipe.id is null or recipe.reputation_required>(select reputation_level from profiles where id=owner) then raise exception 'recipe_locked'; end if;
  for ingredient in select * from recipe_ingredients where recipe_id=p_recipe loop perform adjust_inventory(owner,ingredient.item_id,-ingredient.quantity); end loop;
  perform adjust_inventory(owner,recipe.output_item_id,recipe.output_quantity); perform increment_daily_task(owner,'collect',recipe.output_quantity);
  new_badge:=award_expedition_badges(owner);
  result:=jsonb_build_object('item_id',recipe.output_item_id,'quantity',recipe.output_quantity,'badge',new_badge);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'craft_item',result); return result;
end $$;
grant execute on function public.craft_item(text,uuid) to authenticated;

create or replace function public.get_public_keeper_profile(p_username text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare keeper profiles; result jsonb;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into keeper from profiles where lower(username)=lower(trim(p_username));
  if keeper.id is null then raise exception 'keeper_not_found'; end if;
  select jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,
    'active_pet',case when pet.id is null then null else jsonb_build_object('id',pet.id,'name',pet.name,'species_id',pet.species_id,'palette',greatest(0,right(pet.palette_id,1)::integer-1),'variant',pet.variant,'pronouns',pet.pronouns,'hunger',greatest(20,pet.hunger-floor(extract(epoch from (now()-pet.needs_updated_at))/3600)::integer),'mood',greatest(20,pet.mood-floor(extract(epoch from (now()-pet.needs_updated_at))/7200)::integer),'cleanliness',greatest(20,pet.cleanliness-floor(extract(epoch from (now()-pet.needs_updated_at))/10800)::integer),'equipped',pet.equipped) end,
    'collected',coalesce((select jsonb_agg(entry.item_id order by entry.discovered_at desc) from (select item_id,discovered_at from collection_entries where owner_id=keeper.id order by discovered_at desc limit 6) entry),'[]'::jsonb),
    'wishlist',coalesce((select jsonb_agg(w.item_id order by w.created_at desc) from wishlists w where w.owner_id=keeper.id),'[]'::jsonb),
    'friend_count',(select count(*) from friendships f where f.status='accepted' and keeper.id in(f.requester_id,f.addressee_id)),
    'badges',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'label',b.label,'icon',b.icon,'description',b.description,'earned_at',pb.earned_at) order by pb.earned_at) from profile_expedition_badges pb join expedition_badges b on b.id=pb.badge_id where pb.owner_id=keeper.id),'[]'::jsonb)
  ) into result from pets pet where pet.id=keeper.active_pet_id;
  if result is null then result:=jsonb_build_object('username',keeper.username,'reputation',keeper.reputation_level,'reputation_xp',keeper.reputation_xp,'active_pet',null,'collected','[]'::jsonb,'wishlist','[]'::jsonb,'friend_count',0,'badges','[]'::jsonb); end if;
  return result;
end $$;
grant execute on function public.get_public_keeper_profile(text) to authenticated;
