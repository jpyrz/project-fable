-- First Companion Expedition vertical slice: Sunberry Glen.

alter table public.item_definitions add column if not exists food_trait text;
alter table public.item_definitions drop constraint if exists item_definitions_food_trait_check;
alter table public.item_definitions add constraint item_definitions_food_trait_check
  check (food_trait is null or food_trait in ('cozy','keen','lucky'));

update public.item_definitions
set food_trait=case mod(regexp_replace(id,'[^0-9]','','g')::integer,3)
  when 1 then 'cozy' when 2 then 'keen' else 'lucky' end
where category='food';

create table if not exists public.companion_expeditions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  pet_id uuid not null references public.pets on delete cascade,
  location text not null default 'sunberry-glen' check (location in ('sunberry-glen')),
  duration_minutes integer not null check (duration_minutes in (10,20,30)),
  food_item_id text references public.item_definitions,
  food_trait text check (food_trait is null or food_trait in ('cozy','keen','lucky')),
  seed bigint not null,
  started_at timestamptz not null default now(),
  returns_at timestamptz not null,
  claimed_at timestamptz,
  choice text check (choice is null or choice in ('follow-glow','gather-grove')),
  result jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists companion_expeditions_one_open_idx
  on public.companion_expeditions(owner_id) where claimed_at is null;
create index if not exists companion_expeditions_owner_history_idx
  on public.companion_expeditions(owner_id,created_at desc);

alter table public.companion_expeditions enable row level security;
drop policy if exists "own expedition read" on public.companion_expeditions;
create policy "own expedition read" on public.companion_expeditions
  for select using(owner_id=auth.uid());

create or replace function public.expedition_payload(p_expedition public.companion_expeditions) returns jsonb
language sql stable set search_path=public as $$
  select jsonb_build_object(
    'id',p_expedition.id,
    'location',p_expedition.location,
    'duration_minutes',p_expedition.duration_minutes,
    'pet_name',(select name from pets where id=p_expedition.pet_id),
    'food_item_id',p_expedition.food_item_id,
    'food_trait',p_expedition.food_trait,
    'started_at',p_expedition.started_at,
    'returns_at',p_expedition.returns_at,
    'server_now',now()
  )
$$;
revoke execute on function public.expedition_payload(public.companion_expeditions) from public,anon,authenticated;

create or replace function public.get_current_expedition() returns jsonb
language plpgsql security definer set search_path=public as $$
declare expedition companion_expeditions;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into expedition from companion_expeditions
  where owner_id=auth.uid() and claimed_at is null
  order by created_at desc limit 1;
  if expedition.id is null then return null; end if;
  return expedition_payload(expedition);
end $$;
revoke execute on function public.get_current_expedition() from public,anon;
grant execute on function public.get_current_expedition() to authenticated;

create or replace function public.start_expedition(
  p_pet uuid,p_duration integer,p_food text default null
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  owner uuid:=auth.uid();
  expedition companion_expeditions;
  selected_trait text;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_duration not in (10,20,30) then raise exception 'invalid_duration'; end if;
  if not exists(select 1 from profiles where id=owner and active_pet_id=p_pet)
    or not exists(select 1 from pets where id=p_pet and owner_id=owner) then
    raise exception 'active_pet_required';
  end if;
  if exists(select 1 from companion_expeditions where owner_id=owner and claimed_at is null) then
    raise exception 'expedition_already_active';
  end if;

  if p_food is not null then
    select food_trait into selected_trait from item_definitions
    where id=p_food and category='food' and active;
    if selected_trait is null then raise exception 'invalid_trail_snack'; end if;
    perform adjust_inventory(owner,p_food,-1);
  end if;

  insert into companion_expeditions(
    owner_id,pet_id,duration_minutes,food_item_id,food_trait,seed,returns_at
  ) values(
    owner,p_pet,p_duration,p_food,selected_trait,
    floor(random()*2147483647)::bigint,
    now()+make_interval(mins=>p_duration)
  ) returning * into expedition;

  return expedition_payload(expedition);
end $$;
revoke execute on function public.start_expedition(uuid,integer,text) from public,anon;
grant execute on function public.start_expedition(uuid,integer,text) to authenticated;

create or replace function public.claim_expedition(
  p_expedition uuid,p_choice text,p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  owner uuid:=auth.uid();
  expedition companion_expeditions;
  coin_reward integer;
  reputation_reward integer;
  material_id text;
  material_quantity integer;
  rare_item_id text;
  rare_threshold integer;
  rare_found boolean:=false;
  reward_items jsonb;
  reward_result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then
    return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key);
  end if;
  if p_choice not in ('follow-glow','gather-grove') then raise exception 'invalid_expedition_choice'; end if;

  select * into expedition from companion_expeditions
  where id=p_expedition and owner_id=owner and claimed_at is null for update;
  if expedition.id is null then raise exception 'expedition_not_found'; end if;
  if now()<expedition.returns_at then raise exception 'expedition_not_ready'; end if;

  coin_reward:=case expedition.duration_minutes when 10 then 45 when 20 then 80 else 115 end;
  reputation_reward:=case expedition.duration_minutes when 10 then 12 when 20 then 18 else 25 end
    +case when expedition.food_trait='cozy' then 3 else 0 end;
  material_id:=case mod(expedition.seed,3) when 0 then 'item-10' when 1 then 'item-11' else 'item-14' end;
  material_quantity:=case when p_choice='gather-grove' then 2 else 1 end
    +case when expedition.food_trait='keen' then 1 else 0 end;
  rare_threshold:=case expedition.duration_minutes when 10 then 20 when 20 then 25 else 30 end
    +case when expedition.food_trait='lucky' then 10 else 0 end;
  rare_found:=p_choice='follow-glow' and mod(abs(expedition.seed),100)<rare_threshold;
  rare_item_id:=case when mod(expedition.seed,2)=0 then 'item-25' else 'item-26' end;

  perform adjust_inventory(owner,material_id,material_quantity);
  reward_items:=jsonb_build_array(jsonb_build_object('item_id',material_id,'quantity',material_quantity));
  if rare_found then
    perform adjust_inventory(owner,rare_item_id,1);
    reward_items:=reward_items||jsonb_build_array(jsonb_build_object('item_id',rare_item_id,'quantity',1));
  end if;

  update wallets set balance=balance+coin_reward,updated_at=now() where owner_id=owner;
  update profiles set
    reputation_xp=reputation_xp+reputation_reward,
    reputation_level=greatest(reputation_level,floor((reputation_xp+reputation_reward)/100)+1)
  where id=owner;
  insert into currency_ledger(owner_id,amount,reason,correlation_id)
  values(owner,coin_reward,'expedition_reward',p_idempotency_key);
  perform increment_daily_task(owner,'collect',material_quantity+case when rare_found then 1 else 0 end);

  reward_result:=jsonb_build_object(
    'coins',coin_reward,'reputation',reputation_reward,'items',reward_items,'rare',rare_found,
    'title',case when rare_found then 'A light among the clover!'
      when p_choice='gather-grove' then 'A basket of glen treasures!'
      else 'The fireflies shared a secret!' end,
    'detail',case when rare_found then 'A rare glen treasure followed your companion home.'
      when p_choice='gather-grove' then 'Careful gathering uncovered useful crafting finds.'
      else 'Your companion followed the glow back with a new discovery.' end
  );
  update companion_expeditions set claimed_at=now(),choice=p_choice,result=reward_result where id=expedition.id;
  insert into idempotency_keys(owner_id,key,operation,result)
  values(owner,p_idempotency_key,'claim_expedition',reward_result);
  insert into notifications(owner_id,kind,body) values(
    owner,'expedition_return',(select name from pets where id=expedition.pet_id)||' returned from Sunberry Glen with new finds!'
  );
  return reward_result;
end $$;
revoke execute on function public.claim_expedition(uuid,text,uuid) from public,anon;
grant execute on function public.claim_expedition(uuid,text,uuid) to authenticated;
