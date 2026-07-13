alter table public.profiles add column if not exists age_confirmed_at timestamptz;
create unique index if not exists profiles_username_lower_idx on public.profiles(lower(username));

create table public.wishlists (
  owner_id uuid not null references public.profiles on delete cascade,
  item_id text not null references public.item_definitions on delete cascade,
  created_at timestamptz not null default now(),
  primary key(owner_id,item_id)
);

create table public.npc_purchases (
  owner_id uuid not null references public.profiles on delete cascade,
  item_id text not null references public.item_definitions,
  purchase_date date not null default (now() at time zone 'utc')::date,
  quantity integer not null default 1 check(quantity between 1 and 5),
  primary key(owner_id,item_id,purchase_date)
);

create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null,
  label text not null default '',
  reserved_by uuid,
  reserved_at timestamptz,
  used_by uuid,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  used_at timestamptz
);

alter table public.wishlists enable row level security;
alter table public.npc_purchases enable row level security;
alter table public.invite_codes enable row level security;
create policy "own wishlist read" on public.wishlists for select using(owner_id=auth.uid());
create policy "own npc purchases read" on public.npc_purchases for select using(owner_id=auth.uid());
create policy "admins read invites" on public.invite_codes for select using(exists(select 1 from profiles where id=auth.uid() and role='admin'));

drop policy if exists "public messages readable" on public.messages;
create policy "public messages readable" on public.messages for select using(kind='public' and created_at>now()-interval '30 days' and not exists(select 1 from blocks b where (b.blocker_id=auth.uid() and b.blocked_id=messages.author_id) or (b.blocker_id=messages.author_id and b.blocked_id=auth.uid())));
create policy "moderators read reports" on public.reports for select using(exists(select 1 from profiles where id=auth.uid() and role in ('moderator','admin')));
create policy "moderators update reports" on public.reports for update using(exists(select 1 from profiles where id=auth.uid() and role in ('moderator','admin')));

create or replace function public.increment_daily_task(p_owner uuid,p_task text,p_amount integer default 1) returns void
language plpgsql security definer set search_path=public as $$
begin
  insert into task_completions(owner_id,task_id,progress)
  values(p_owner,p_task,greatest(0,p_amount))
  on conflict(owner_id,task_id,task_date) do update
  set progress=least((select target from daily_tasks where id=p_task),task_completions.progress+greatest(0,p_amount));
end $$;
revoke execute on function public.increment_daily_task(uuid,text,integer) from public,anon,authenticated;

create or replace function public.hook_require_invite(event jsonb) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare code text:=lower(trim(event->'user'->'user_metadata'->>'invite_code')); proposed_id uuid:=(event->'user'->>'id')::uuid; invite_id uuid; proposed_name text:=event->'user'->'user_metadata'->>'username';
begin
  if code is null or length(code)<6 then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','A valid invitation code is required.'));
  end if;
  if proposed_name is null or proposed_name !~ '^[A-Za-z0-9_]{3,20}$' or exists(select 1 from profiles where lower(username)=lower(proposed_name)) then
    return jsonb_build_object('error',jsonb_build_object('http_code',400,'message','That Keeper name is unavailable.'));
  end if;
  select id into invite_id from invite_codes
  where code_hash=encode(digest(code,'sha256'),'hex') and used_by is null and expires_at>now() and (reserved_by is null or reserved_by=proposed_id or reserved_at<now()-interval '15 minutes')
  for update;
  if invite_id is null then
    return jsonb_build_object('error',jsonb_build_object('http_code',403,'message','That invitation is invalid, expired, or already used.'));
  end if;
  update invite_codes set reserved_by=proposed_id,reserved_at=now() where id=invite_id;
  return '{}'::jsonb;
end $$;
grant execute on function public.hook_require_invite(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_require_invite(jsonb) from public,anon,authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,username) values(new.id,new.raw_user_meta_data->>'username');
  insert into public.wallets(owner_id,balance) values(new.id,500);
  insert into public.currency_ledger(owner_id,amount,reason,correlation_id) values(new.id,500,'starter_grant',gen_random_uuid());
  update public.invite_codes set used_by=new.id,used_at=now() where reserved_by=new.id and used_by is null;
  return new;
end $$;

create or replace function public.complete_onboarding(p_username text,p_pet_name text,p_species text,p_palette integer) returns uuid
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); pet_id uuid; palette_key text:=p_species||'-'||(p_palette+1);
begin
  if owner is null then raise exception 'authentication_required'; end if;
  if p_username !~ '^[A-Za-z0-9_]{3,20}$' then raise exception 'invalid_username'; end if;
  if not exists(select 1 from species where id=p_species) or not exists(select 1 from palettes where id=palette_key and species_id=p_species) then raise exception 'invalid_pet'; end if;
  if exists(select 1 from pets where owner_id=owner) then raise exception 'onboarding_complete'; end if;
  update profiles set username=p_username,age_confirmed_at=now() where id=owner;
  insert into pets(owner_id,species_id,palette_id,name) values(owner,p_species,palette_key,p_pet_name) returning id into pet_id;
  update profiles set active_pet_id=pet_id where id=owner;
  perform adjust_inventory(owner,'item-1',2); perform adjust_inventory(owner,'item-6',1); perform adjust_inventory(owner,'item-10',4); perform adjust_inventory(owner,'item-11',3); perform adjust_inventory(owner,'item-13',2); perform adjust_inventory(owner,'item-14',2);
  return pet_id;
end $$;

create or replace function public.buy_shop_item(p_item text,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); item item_definitions; purchased integer; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  select * into item from item_definitions where id=p_item and active and rarity in ('common','uncommon') and base_price>0;
  if item.id is null then raise exception 'item_unavailable'; end if;
  select quantity into purchased from npc_purchases where owner_id=owner and item_id=p_item and purchase_date=(now() at time zone 'utc')::date for update;
  if coalesce(purchased,0)>=3 then raise exception 'daily_purchase_limit'; end if;
  update wallets set balance=balance-item.base_price,updated_at=now() where owner_id=owner and balance>=item.base_price;
  if not found then raise exception 'insufficient_funds'; end if;
  insert into npc_purchases(owner_id,item_id,quantity) values(owner,p_item,1) on conflict(owner_id,item_id,purchase_date) do update set quantity=npc_purchases.quantity+1;
  perform adjust_inventory(owner,p_item,1); perform increment_daily_task(owner,'collect',1);
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(owner,-item.base_price,'npc_purchase',p_idempotency_key);
  result:=jsonb_build_object('item_id',p_item,'price',item.base_price);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'buy_shop_item',result); return result;
end $$;

create or replace function public.toggle_wishlist_item(p_item text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if exists(select 1 from wishlists where owner_id=auth.uid() and item_id=p_item) then delete from wishlists where owner_id=auth.uid() and item_id=p_item; return false;
  else insert into wishlists(owner_id,item_id) values(auth.uid(),p_item); return true; end if;
end $$;

create or replace function public.craft_item(p_recipe text,p_idempotency_key uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); recipe recipes; ingredient record; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  select * into recipe from recipes where id=p_recipe and active;
  if recipe.id is null or recipe.reputation_required>(select reputation_level from profiles where id=owner) then raise exception 'recipe_locked'; end if;
  for ingredient in select * from recipe_ingredients where recipe_id=p_recipe loop perform adjust_inventory(owner,ingredient.item_id,-ingredient.quantity); end loop;
  perform adjust_inventory(owner,recipe.output_item_id,recipe.output_quantity); perform increment_daily_task(owner,'collect',recipe.output_quantity);
  result:=jsonb_build_object('item_id',recipe.output_item_id,'quantity',recipe.output_quantity);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'craft_item',result); return result;
end $$;

create or replace function public.claim_daily_task(p_task text,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); task daily_tasks; completion task_completions; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  select * into task from daily_tasks where id=p_task and active; select * into completion from task_completions where owner_id=owner and task_id=p_task and task_date=(now() at time zone 'utc')::date for update;
  if task.id is null or completion.progress<task.target or completion.claimed_at is not null then raise exception 'task_not_claimable'; end if;
  update task_completions set claimed_at=now() where owner_id=owner and task_id=p_task and task_date=completion.task_date;
  update wallets set balance=balance+task.reward,updated_at=now() where owner_id=owner; update profiles set reputation_xp=reputation_xp+task.reputation_reward,reputation_level=greatest(reputation_level,floor((reputation_xp+task.reputation_reward)/100)+1) where id=owner;
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(owner,task.reward,'daily_task',p_idempotency_key);
  result:=jsonb_build_object('reward',task.reward,'reputation',task.reputation_reward); insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'claim_daily_task',result); return result;
end $$;

create or replace function public.mark_notifications_read() returns void language sql security definer set search_path=public as $$ update notifications set read_at=coalesce(read_at,now()) where owner_id=auth.uid() $$;

create or replace function public.create_invite_code(p_label text default '') returns text
language plpgsql security definer set search_path=public,extensions as $$
declare code text:=upper(substr(encode(gen_random_bytes(8),'hex'),1,12));
begin
  if not exists(select 1 from profiles where id=auth.uid() and role='admin') then raise exception 'admin_required'; end if;
  insert into invite_codes(code_hash,label) values(encode(digest(lower(code),'sha256'),'hex'),left(coalesce(p_label,''),80)); return code;
end $$;

create or replace function public.submit_message_report(p_message uuid,p_reason text) returns uuid
language plpgsql security definer set search_path=public as $$
declare report_id uuid:=gen_random_uuid(); reported_author uuid;
begin
  select author_id into reported_author from messages m where m.id=p_message and m.author_id<>auth.uid() and (m.kind='public' or exists(select 1 from dm_participants dp where dp.thread_id=m.thread_id and dp.profile_id=auth.uid()));
  if reported_author is null then raise exception 'message_not_reportable'; end if;
  if exists(select 1 from reports where reporter_id=auth.uid() and message_id=p_message and status in ('open','reviewing')) then raise exception 'already_reported'; end if;
  insert into reports(id,reporter_id,message_id,subject_id,reason) values(report_id,auth.uid(),p_message,reported_author,left(trim(p_reason),500)); return report_id;
end $$;

create or replace function public.send_friend_request(p_username text) returns void
language plpgsql security definer set search_path=public as $$
declare friend uuid;
begin
  select id into friend from profiles where lower(username)=lower(trim(p_username)) and id<>auth.uid() and banned_at is null;
  if friend is null then raise exception 'keeper_not_found'; end if;
  if exists(select 1 from blocks where (blocker_id=auth.uid() and blocked_id=friend) or (blocker_id=friend and blocked_id=auth.uid())) then raise exception 'friendship_unavailable'; end if;
  if exists(select 1 from friendships where (requester_id=auth.uid() and addressee_id=friend) or (requester_id=friend and addressee_id=auth.uid())) then raise exception 'friendship_exists'; end if;
  insert into friendships(requester_id,addressee_id) values(auth.uid(),friend);
  insert into notifications(owner_id,kind,body) values(friend,'friend_request','You received a new friend request.');
end $$;

create or replace function public.respond_friend_request(p_requester uuid,p_accept boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
  update friendships set status=case when p_accept then 'accepted'::friendship_status else 'declined'::friendship_status end,responded_at=now() where requester_id=p_requester and addressee_id=auth.uid() and status='pending';
  if not found then raise exception 'request_not_found'; end if;
  if p_accept then insert into notifications(owner_id,kind,body) values(p_requester,'friend_accepted','Your friend request was accepted.'); end if;
end $$;

create or replace function public.send_dm(p_friend uuid,p_body text) returns public.messages language plpgsql security definer set search_path=public as $$
declare thread uuid; result messages; clean text:=trim(regexp_replace(p_body,'https?://\\S+','[link removed]','gi'));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if length(clean)<1 then raise exception 'empty_message'; end if;
  if exists(select 1 from profiles where id=auth.uid() and (banned_at is not null or muted_until>now())) then raise exception 'messaging_restricted'; end if;
  if (select count(*) from messages where author_id=auth.uid() and created_at>now()-interval '10 seconds')>=4 then raise exception 'rate_limited'; end if;
  if not exists(select 1 from friendships where status='accepted' and ((requester_id=auth.uid() and addressee_id=p_friend) or (requester_id=p_friend and addressee_id=auth.uid()))) then raise exception 'friends_only'; end if;
  if exists(select 1 from blocks where (blocker_id=auth.uid() and blocked_id=p_friend) or (blocker_id=p_friend and blocked_id=auth.uid())) then raise exception 'blocked'; end if;
  select dp.thread_id into thread from dm_participants dp where dp.profile_id=auth.uid() and exists(select 1 from dm_participants other where other.thread_id=dp.thread_id and other.profile_id=p_friend) and (select count(*) from dm_participants allp where allp.thread_id=dp.thread_id)=2 limit 1;
  if thread is null then insert into dm_threads default values returning id into thread; insert into dm_participants(thread_id,profile_id) values(thread,auth.uid()),(thread,p_friend); end if;
  insert into messages(kind,author_id,thread_id,body) values('dm',auth.uid(),thread,left(clean,280)) returning * into result;
  insert into notifications(owner_id,kind,body) values(p_friend,'dm','You have a new message from a friend.'); return result;
end $$;

create or replace function public.care_pet(p_pet uuid,p_kind text) returns public.pets language plpgsql security definer set search_path=public as $$
declare result pets;
begin
  if p_kind not in ('food','groom','play') then raise exception 'invalid_care_kind'; end if;
  update pets set hunger=least(100,hunger+case when p_kind='food' then 18 else 3 end),mood=least(100,mood+case when p_kind='play' then 18 else 4 end),cleanliness=least(100,cleanliness+case when p_kind='groom' then 20 else 2 end) where id=p_pet and owner_id=auth.uid() returning * into result;
  if result.id is null then raise exception 'pet_not_found'; end if; perform increment_daily_task(auth.uid(),'care',1); return result;
end $$;

create or replace function public.submit_game_run(p_run uuid,p_score integer,p_idempotency_key uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare run game_runs; elapsed numeric; reward integer; suspicious boolean; result jsonb; material text;
begin
  if exists(select 1 from idempotency_keys where owner_id=auth.uid() and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=auth.uid() and key=p_idempotency_key); end if;
  select * into run from game_runs where id=p_run and owner_id=auth.uid() for update;
  if run.id is null or run.finished_at is not null then raise exception 'invalid_run'; end if;
  elapsed:=extract(epoch from now()-run.started_at); suspicious:=elapsed<20 or elapsed>180 or p_score<0 or p_score>2000; reward:=case when suspicious then 0 else least(90,greatest(10,floor(p_score/3))) end; material:=case when mod(p_score,2)=0 then 'item-10' else 'item-11' end;
  update game_runs set finished_at=now(),score=p_score,reward=reward,suspicious=suspicious where id=p_run;
  if reward>0 then update wallets set balance=balance+reward,updated_at=now() where owner_id=auth.uid(); insert into currency_ledger(owner_id,amount,reason,correlation_id) values(auth.uid(),reward,'game_reward',p_idempotency_key); update profiles set reputation_xp=reputation_xp+8,reputation_level=greatest(reputation_level,floor((reputation_xp+8)/100)+1) where id=auth.uid(); perform adjust_inventory(auth.uid(),material,1); perform increment_daily_task(auth.uid(),'play',1); perform increment_daily_task(auth.uid(),'collect',1); end if;
  result:=jsonb_build_object('score',p_score,'reward',reward,'suspicious',suspicious,'item_id',case when reward>0 then material else null end); insert into idempotency_keys(owner_id,key,operation,result) values(auth.uid(),p_idempotency_key,'submit_game_run',result); return result;
end $$;

create or replace function public.get_game_snapshot() returns jsonb language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); result jsonb;
begin
  if owner is null then raise exception 'authentication_required'; end if;
  select jsonb_build_object(
    'profile',(select jsonb_build_object('username',p.username,'role',p.role,'age_confirmed',p.age_confirmed_at is not null,'reputation',p.reputation_level,'reputation_xp',p.reputation_xp,'active_pet_id',p.active_pet_id) from profiles p where p.id=owner),
    'coins',coalesce((select balance from wallets where owner_id=owner),0),
    'pets',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'species_id',p.species_id,'palette',greatest(0,right(p.palette_id,1)::integer-1),'hunger',p.hunger,'mood',p.mood,'cleanliness',p.cleanliness,'equipped',p.equipped) order by p.created_at) from pets p where p.owner_id=owner),'[]'::jsonb),
    'inventory',coalesce((select jsonb_object_agg(i.item_id,i.quantity) from inventory_stacks i where i.owner_id=owner and i.quantity>0),'{}'::jsonb),
    'collected',coalesce((select jsonb_agg(c.item_id order by c.discovered_at) from collection_entries c where c.owner_id=owner),'[]'::jsonb),
    'wishlist',coalesce((select jsonb_agg(w.item_id order by w.created_at) from wishlists w where w.owner_id=owner),'[]'::jsonb),
    'listings',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'item_id',l.item_id,'seller',p.username,'price',l.unit_price*l.quantity,'quantity',l.quantity) order by l.created_at desc) from market_listings l join profiles p on p.id=l.seller_id where l.status='active' and l.expires_at>now() and l.seller_id<>owner),'[]'::jsonb),
    'messages',coalesce((select jsonb_agg(x.payload order by x.created_at) from (select m.created_at,jsonb_build_object('id',m.id,'channel',case when m.kind='public' then case when m.channel_id='off-topic' then 'Off-topic' else initcap(m.channel_id) end else 'DM:'||(select op.username from dm_participants dp join profiles op on op.id=dp.profile_id where dp.thread_id=m.thread_id and dp.profile_id<>owner limit 1) end,'author',a.username,'body',m.body,'time',to_char(m.created_at at time zone 'utc','HH24:MI'),'own',m.author_id=owner) payload from messages m join profiles a on a.id=m.author_id where m.deleted_at is null and not exists(select 1 from blocks b where (b.blocker_id=owner and b.blocked_id=m.author_id) or (b.blocker_id=m.author_id and b.blocked_id=owner)) and ((m.kind='public' and m.created_at>now()-interval '30 days') or (m.kind='dm' and m.created_at>now()-interval '90 days' and exists(select 1 from dm_participants dp where dp.thread_id=m.thread_id and dp.profile_id=owner))) order by m.created_at desc limit 150) x),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'text',n.body,'read',n.read_at is not null) order by n.created_at desc) from notifications n where n.owner_id=owner),'[]'::jsonb),
    'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'progress',coalesce(c.progress,0),'target',t.target,'reward',t.reward,'claimed',c.claimed_at is not null) order by t.id) from daily_tasks t left join task_completions c on c.task_id=t.id and c.owner_id=owner and c.task_date=(now() at time zone 'utc')::date where t.active),'[]'::jsonb),
    'daily_wish_claimed',exists(select 1 from daily_wishes d where d.owner_id=owner and d.wish_date=(now() at time zone 'utc')::date),
    'friends',coalesce((select jsonb_agg(jsonb_build_object('id',f.friend_id,'name',p.username,'pet',coalesce(pet.name,'No active Fable'),'online',false) order by p.username) from (select case when requester_id=owner then addressee_id else requester_id end friend_id from friendships where status='accepted' and owner in (requester_id,addressee_id)) f join profiles p on p.id=f.friend_id left join pets pet on pet.id=p.active_pet_id),'[]'::jsonb),
    'friend_requests',coalesce((select jsonb_agg(jsonb_build_object('requester_id',f.requester_id,'name',p.username) order by f.created_at) from friendships f join profiles p on p.id=f.requester_id where f.addressee_id=owner and f.status='pending'),'[]'::jsonb)
  ) into result;
  return result;
end $$;

grant execute on function public.complete_onboarding(text,text,text,integer) to authenticated;
grant execute on function public.buy_shop_item(text,uuid) to authenticated;
grant execute on function public.toggle_wishlist_item(text) to authenticated;
grant execute on function public.claim_daily_task(text,uuid) to authenticated;
grant execute on function public.mark_notifications_read() to authenticated;
grant execute on function public.get_game_snapshot() to authenticated;
grant execute on function public.create_invite_code(text) to authenticated;
grant execute on function public.submit_message_report(uuid,text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.market_listings;
alter publication supabase_realtime add table public.friendships;
