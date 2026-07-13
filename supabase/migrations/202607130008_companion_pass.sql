-- Companion pass: expressive pet profiles, gentle need decay, and rotating adventures.
alter table public.pets add column if not exists variant text not null default 'classic';
alter table public.pets add column if not exists pronouns text not null default 'they/them';
alter table public.pets add column if not exists needs_updated_at timestamptz not null default now();

alter table public.pets drop constraint if exists pets_variant_check;
alter table public.pets add constraint pets_variant_check check (variant in ('classic','tufted'));
alter table public.pets drop constraint if exists pets_pronouns_check;
alter table public.pets add constraint pets_pronouns_check check (pronouns in ('they/them','she/her','he/him'));

alter table public.daily_tasks add column if not exists task_kind text;
alter table public.daily_tasks add column if not exists rotation_slot integer not null default 0;
update public.daily_tasks set task_kind=id where task_kind is null;
alter table public.daily_tasks alter column task_kind set not null;
alter table public.daily_tasks drop constraint if exists daily_tasks_kind_check;
alter table public.daily_tasks add constraint daily_tasks_kind_check check (task_kind in ('care','play','collect'));
alter table public.daily_tasks drop constraint if exists daily_tasks_rotation_slot_check;
alter table public.daily_tasks add constraint daily_tasks_rotation_slot_check check (rotation_slot between 0 and 6);
create unique index if not exists daily_tasks_kind_slot_idx on public.daily_tasks(task_kind,rotation_slot);

insert into public.daily_tasks(id,label,target,reward,reputation_reward,active,task_kind,rotation_slot) values
  ('care-cozy','Share three cozy care moments',3,75,15,true,'care',1),
  ('play-double','Finish two arcade adventures',2,110,20,true,'play',1),
  ('collect-curious','Discover or gather 3 items',3,120,20,true,'collect',1)
on conflict (id) do update set
  label=excluded.label,target=excluded.target,reward=excluded.reward,
  reputation_reward=excluded.reputation_reward,active=excluded.active,
  task_kind=excluded.task_kind,rotation_slot=excluded.rotation_slot;

update public.daily_tasks set task_kind='care',rotation_slot=0 where id='care';
update public.daily_tasks set task_kind='play',rotation_slot=0 where id='play';
update public.daily_tasks set task_kind='collect',rotation_slot=0 where id='collect';

create or replace function public.daily_rotation_slot() returns integer
language sql stable set search_path=public as $$
  select mod(((now() at time zone 'utc')::date - date '2026-01-01'),2)
$$;
revoke execute on function public.daily_rotation_slot() from public,anon;
grant execute on function public.daily_rotation_slot() to authenticated;

create or replace function public.get_daily_adventures() returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select jsonb_build_object(
    'tasks',coalesce(jsonb_agg(jsonb_build_object(
      'id',t.id,'kind',t.task_kind,'label',t.label,
      'progress',coalesce(c.progress,0),'target',t.target,'reward',t.reward,
      'claimed',c.claimed_at is not null
    ) order by case t.task_kind when 'care' then 1 when 'play' then 2 else 3 end),'[]'::jsonb),
    'reset_at',to_char(((now() at time zone 'utc')::date + 1)::timestamp at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ) into result
  from daily_tasks t
  left join task_completions c on c.task_id=t.id and c.owner_id=owner and c.task_date=(now() at time zone 'utc')::date
  where t.active and t.rotation_slot=public.daily_rotation_slot();
  return result;
end $$;
grant execute on function public.get_daily_adventures() to authenticated;

create or replace function public.increment_daily_task(p_owner uuid,p_task text,p_amount integer default 1) returns void
language plpgsql security definer set search_path=public as $$
declare selected_task daily_tasks;
begin
  select * into selected_task from daily_tasks
  where task_kind=p_task and rotation_slot=public.daily_rotation_slot() and active
  limit 1;
  if selected_task.id is null then return; end if;
  insert into task_completions(owner_id,task_id,progress)
  values(p_owner,selected_task.id,least(selected_task.target,greatest(0,p_amount)))
  on conflict(owner_id,task_id,task_date) do update
  set progress=least(selected_task.target,task_completions.progress+greatest(0,p_amount));
end $$;
revoke execute on function public.increment_daily_task(uuid,text,integer) from public,anon,authenticated;

create or replace function public.claim_daily_task(p_task text,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); task daily_tasks; completion task_completions; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then
    return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key);
  end if;
  select * into task from daily_tasks where id=p_task and active and rotation_slot=public.daily_rotation_slot();
  select * into completion from task_completions where owner_id=owner and task_id=p_task and task_date=(now() at time zone 'utc')::date for update;
  if task.id is null or completion.progress<task.target or completion.claimed_at is not null then raise exception 'task_not_claimable'; end if;
  update task_completions set claimed_at=now() where owner_id=owner and task_id=p_task and task_date=completion.task_date;
  update wallets set balance=balance+task.reward,updated_at=now() where owner_id=owner;
  update profiles set reputation_xp=reputation_xp+task.reputation_reward,reputation_level=greatest(reputation_level,floor((reputation_xp+task.reputation_reward)/100)+1) where id=owner;
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(owner,task.reward,'daily_task',p_idempotency_key);
  result:=jsonb_build_object('reward',task.reward,'reputation',task.reputation_reward);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'claim_daily_task',result);
  return result;
end $$;
grant execute on function public.claim_daily_task(text,uuid) to authenticated;

create or replace function public.get_pet_companions() returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'name',p.name,'species_id',p.species_id,
    'palette',greatest(0,right(p.palette_id,1)::integer-1),
    'variant',p.variant,'pronouns',p.pronouns,
    'hunger',greatest(20,p.hunger-floor(extract(epoch from (now()-p.needs_updated_at))/14400)::integer),
    'mood',greatest(20,p.mood-floor(extract(epoch from (now()-p.needs_updated_at))/21600)::integer),
    'cleanliness',greatest(20,p.cleanliness-floor(extract(epoch from (now()-p.needs_updated_at))/28800)::integer),
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
  if p_kind not in ('food','groom','play') then raise exception 'invalid_care_kind'; end if;
  select extract(epoch from (now()-needs_updated_at)) into elapsed_seconds from pets where id=p_pet and owner_id=auth.uid() for update;
  if elapsed_seconds is null then raise exception 'pet_not_found'; end if;
  update pets set
    hunger=least(100,greatest(20,hunger-floor(elapsed_seconds/14400)::integer)+case when p_kind='food' then 18 else 3 end),
    mood=least(100,greatest(20,mood-floor(elapsed_seconds/21600)::integer)+case when p_kind='play' then 18 else 4 end),
    cleanliness=least(100,greatest(20,cleanliness-floor(elapsed_seconds/28800)::integer)+case when p_kind='groom' then 20 else 2 end),
    needs_updated_at=now()
  where id=p_pet and owner_id=auth.uid() returning * into result;
  perform increment_daily_task(auth.uid(),'care',1);
  return result;
end $$;
grant execute on function public.care_pet(uuid,text) to authenticated;

create or replace function public.complete_onboarding(
  p_username text,p_pet_name text,p_species text,p_palette integer,
  p_variant text,p_pronouns text
) returns uuid
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); pet_id uuid; palette_key text:=p_species||'-'||(p_palette+1);
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'invalid_username'; end if;
  if p_variant not in ('classic','tufted') or p_pronouns not in ('they/them','she/her','he/him') then raise exception 'invalid_pet_style'; end if;
  if not exists(select 1 from species where id=p_species) or not exists(select 1 from palettes where id=palette_key and species_id=p_species) then raise exception 'invalid_pet'; end if;
  if exists(select 1 from pets where owner_id=owner) then raise exception 'onboarding_complete'; end if;
  update profiles set username=p_username,age_confirmed_at=now() where id=owner;
  insert into pets(owner_id,species_id,palette_id,name,variant,pronouns)
  values(owner,p_species,palette_key,p_pet_name,p_variant,p_pronouns) returning id into pet_id;
  update profiles set active_pet_id=pet_id where id=owner;
  perform adjust_inventory(owner,'item-1',2); perform adjust_inventory(owner,'item-6',1);
  perform adjust_inventory(owner,'item-10',4); perform adjust_inventory(owner,'item-11',3);
  perform adjust_inventory(owner,'item-13',2); perform adjust_inventory(owner,'item-14',2);
  return pet_id;
end $$;
grant execute on function public.complete_onboarding(text,text,text,integer,text,text) to authenticated;
