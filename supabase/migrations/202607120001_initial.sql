create extension if not exists pgcrypto;

create type public.item_category as enum ('food','care','material','collectible','accessory','background');
create type public.item_rarity as enum ('common','uncommon','rare','mythic');
create type public.friendship_status as enum ('pending','accepted','declined');
create type public.listing_status as enum ('active','sold','cancelled');
create type public.message_kind as enum ('public','dm');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  birth_year smallint,
  bio text not null default '' check (length(bio) <= 240),
  reputation_level integer not null default 1 check (reputation_level > 0),
  reputation_xp integer not null default 0 check (reputation_xp >= 0),
  active_pet_id uuid,
  role text not null default 'player' check (role in ('player','moderator','admin')),
  muted_until timestamptz,
  banned_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.species (id text primary key, name text unique not null, tagline text not null, asset_key text not null);
create table public.palettes (id text primary key, species_id text not null references public.species, name text not null, color text not null);
create table public.pets (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade,
  species_id text not null references public.species, palette_id text not null references public.palettes,
  name text not null check (length(name) between 2 and 18), hunger smallint not null default 80 check (hunger between 0 and 100),
  mood smallint not null default 80 check (mood between 0 and 100), cleanliness smallint not null default 80 check (cleanliness between 0 and 100),
  equipped jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_active_pet_fk foreign key (active_pet_id) references public.pets(id) on delete set null;

create table public.item_definitions (
  id text primary key, name text unique not null, category public.item_category not null, rarity public.item_rarity not null,
  base_price integer not null check (base_price >= 0), icon text not null, asset_key text, description text not null,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.inventory_stacks (
  owner_id uuid not null references public.profiles on delete cascade, item_id text not null references public.item_definitions,
  quantity integer not null check (quantity >= 0), updated_at timestamptz not null default now(), primary key (owner_id,item_id)
);
create table public.collection_entries (owner_id uuid not null references public.profiles on delete cascade, item_id text not null references public.item_definitions, discovered_at timestamptz not null default now(), primary key(owner_id,item_id));
create table public.wallets (owner_id uuid primary key references public.profiles on delete cascade, balance bigint not null default 500 check (balance >= 0), updated_at timestamptz not null default now());
create table public.currency_ledger (
  id bigint generated always as identity primary key, owner_id uuid not null references public.profiles on delete cascade,
  amount bigint not null check (amount <> 0), reason text not null, correlation_id uuid not null, created_at timestamptz not null default now(),
  unique(owner_id,correlation_id,reason)
);
create table public.recipes (id text primary key, output_item_id text not null references public.item_definitions, output_quantity integer not null default 1, reputation_required integer not null default 1, active boolean not null default true);
create table public.recipe_ingredients (recipe_id text not null references public.recipes on delete cascade, item_id text not null references public.item_definitions, quantity integer not null check(quantity > 0), primary key(recipe_id,item_id));

create table public.market_listings (
  id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles,
  item_id text not null references public.item_definitions, quantity integer not null check(quantity > 0), unit_price integer not null check(unit_price > 0),
  status public.listing_status not null default 'active', buyer_id uuid references public.profiles, sold_at timestamptz,
  created_at timestamptz not null default now(), expires_at timestamptz not null default now() + interval '7 days'
);
create index market_listings_active_idx on public.market_listings(status,item_id,unit_price) where status = 'active';
create table public.idempotency_keys (owner_id uuid not null references public.profiles on delete cascade, key uuid not null, operation text not null, result jsonb, created_at timestamptz not null default now(), primary key(owner_id,key));

create table public.daily_tasks (id text primary key, label text not null, target integer not null, reward integer not null, reputation_reward integer not null default 10, active boolean not null default true);
create table public.task_completions (owner_id uuid not null references public.profiles on delete cascade, task_id text not null references public.daily_tasks, task_date date not null default (now() at time zone 'utc')::date, progress integer not null default 0, claimed_at timestamptz, primary key(owner_id,task_id,task_date));
create table public.game_runs (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade, game_id text not null check(game_id in ('bloom-match','starwhisk-sprint')), seed bigint not null, started_at timestamptz not null default now(), finished_at timestamptz, score integer, reward integer, suspicious boolean not null default false);
create table public.daily_wishes (owner_id uuid not null references public.profiles on delete cascade, wish_date date not null default (now() at time zone 'utc')::date, reward integer not null, claimed_at timestamptz not null default now(), primary key(owner_id,wish_date));

create table public.friendships (requester_id uuid not null references public.profiles on delete cascade, addressee_id uuid not null references public.profiles on delete cascade, status public.friendship_status not null default 'pending', created_at timestamptz not null default now(), responded_at timestamptz, primary key(requester_id,addressee_id), check(requester_id <> addressee_id));
create table public.blocks (blocker_id uuid not null references public.profiles on delete cascade, blocked_id uuid not null references public.profiles on delete cascade, created_at timestamptz not null default now(), primary key(blocker_id,blocked_id), check(blocker_id <> blocked_id));
create table public.chat_channels (id text primary key, label text unique not null, description text not null, active boolean not null default true);
create table public.dm_threads (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now());
create table public.dm_participants (thread_id uuid not null references public.dm_threads on delete cascade, profile_id uuid not null references public.profiles on delete cascade, joined_at timestamptz not null default now(), primary key(thread_id,profile_id));
create table public.messages (
  id uuid primary key default gen_random_uuid(), kind public.message_kind not null, author_id uuid not null references public.profiles on delete cascade,
  channel_id text references public.chat_channels, thread_id uuid references public.dm_threads on delete cascade, body text not null check(length(body) between 1 and 280),
  created_at timestamptz not null default now(), deleted_at timestamptz, check((kind='public' and channel_id is not null and thread_id is null) or (kind='dm' and thread_id is not null and channel_id is null))
);
create index messages_channel_idx on public.messages(channel_id,created_at desc) where deleted_at is null;
create index messages_thread_idx on public.messages(thread_id,created_at desc) where deleted_at is null;
create table public.reports (id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles, message_id uuid references public.messages, subject_id uuid references public.profiles, reason text not null check(length(reason) between 3 and 500), status text not null default 'open' check(status in ('open','reviewing','resolved','dismissed')), created_at timestamptz not null default now());
create table public.moderation_actions (id uuid primary key default gen_random_uuid(), moderator_id uuid not null references public.profiles, subject_id uuid not null references public.profiles, action text not null check(action in ('warn','mute','ban','unban')), reason text not null, expires_at timestamptz, created_at timestamptz not null default now());
create table public.notifications (id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade, kind text not null, body text not null, read_at timestamptz, created_at timestamptz not null default now());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,username) values(new.id, coalesce(nullif(new.raw_user_meta_data->>'username',''),'keeper_' || left(new.id::text,8)));
  insert into public.wallets(owner_id,balance) values(new.id,500);
  insert into public.currency_ledger(owner_id,amount,reason,correlation_id) values(new.id,500,'starter_grant',gen_random_uuid());
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.adjust_inventory(p_owner uuid,p_item text,p_delta integer) returns void language plpgsql security definer set search_path=public as $$
declare current_quantity integer;
begin
  select quantity into current_quantity from inventory_stacks where owner_id=p_owner and item_id=p_item for update;
  if coalesce(current_quantity,0)+p_delta < 0 then raise exception 'insufficient_inventory'; end if;
  insert into inventory_stacks(owner_id,item_id,quantity) values(p_owner,p_item,p_delta)
  on conflict(owner_id,item_id) do update set quantity=inventory_stacks.quantity+p_delta,updated_at=now();
  insert into collection_entries(owner_id,item_id) values(p_owner,p_item) on conflict do nothing;
end $$;

create or replace function public.buy_listing(p_listing uuid,p_idempotency_key uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare buyer uuid:=auth.uid(); listing market_listings; total bigint; fee bigint; prior jsonb; result jsonb;
begin
  if buyer is null then raise exception 'authentication_required'; end if;
  select result into prior from idempotency_keys where owner_id=buyer and key=p_idempotency_key;
  if found then return prior; end if;
  select * into listing from market_listings where id=p_listing for update;
  if listing.id is null or listing.status <> 'active' or listing.expires_at <= now() then raise exception 'listing_unavailable'; end if;
  if listing.seller_id=buyer then raise exception 'cannot_buy_own_listing'; end if;
  total:=listing.unit_price*listing.quantity; fee:=ceil(total*.05);
  update wallets set balance=balance-total,updated_at=now() where owner_id=buyer and balance>=total;
  if not found then raise exception 'insufficient_funds'; end if;
  update wallets set balance=balance+total-fee,updated_at=now() where owner_id=listing.seller_id;
  perform adjust_inventory(buyer,listing.item_id,listing.quantity);
  update market_listings set status='sold',buyer_id=buyer,sold_at=now() where id=listing.id;
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(buyer,-total,'market_purchase',p_idempotency_key),(listing.seller_id,total-fee,'market_sale',p_idempotency_key);
  insert into notifications(owner_id,kind,body) values(listing.seller_id,'market_sale','One of your marketplace listings sold.');
  result:=jsonb_build_object('listing_id',listing.id,'item_id',listing.item_id,'quantity',listing.quantity,'total',total);
  insert into idempotency_keys(owner_id,key,operation,result) values(buyer,p_idempotency_key,'buy_listing',result);
  return result;
end $$;

create or replace function public.care_pet(p_pet uuid,p_kind text) returns public.pets language plpgsql security definer set search_path=public as $$
declare result pets;
begin
  if p_kind not in ('food','groom','play') then raise exception 'invalid_care_kind'; end if;
  update pets set hunger=least(100,hunger+case when p_kind='food' then 18 else 3 end),mood=least(100,mood+case when p_kind='play' then 18 else 4 end),cleanliness=least(100,cleanliness+case when p_kind='groom' then 20 else 2 end) where id=p_pet and owner_id=auth.uid() returning * into result;
  if result.id is null then raise exception 'pet_not_found'; end if; return result;
end $$;

create or replace function public.send_channel_message(p_channel text,p_body text) returns public.messages language plpgsql security definer set search_path=public as $$
declare result messages; clean text:=trim(regexp_replace(p_body,'https?://\\S+','[link removed]','gi'));
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if exists(select 1 from profiles where id=auth.uid() and (banned_at is not null or muted_until>now())) then raise exception 'messaging_restricted'; end if;
  if (select count(*) from messages where author_id=auth.uid() and created_at>now()-interval '10 seconds')>=4 then raise exception 'rate_limited'; end if;
  insert into messages(kind,author_id,channel_id,body) values('public',auth.uid(),p_channel,left(clean,280)) returning * into result; return result;
end $$;

create or replace function public.create_listing(p_item text,p_quantity integer,p_unit_price integer,p_idempotency_key uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare listing_id uuid:=gen_random_uuid(); owner uuid:=auth.uid();
begin
  if owner is null or p_quantity<1 or p_unit_price<1 then raise exception 'invalid_listing'; end if;
  if (select count(*) from market_listings where seller_id=owner and status='active') >= 5 + (select reputation_level from profiles where id=owner) then raise exception 'listing_limit'; end if;
  perform adjust_inventory(owner,p_item,-p_quantity);
  insert into market_listings(id,seller_id,item_id,quantity,unit_price) values(listing_id,owner,p_item,p_quantity,p_unit_price);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'create_listing',jsonb_build_object('listing_id',listing_id));
  return listing_id;
exception when unique_violation then return ((select result from idempotency_keys where owner_id=owner and key=p_idempotency_key)->>'listing_id')::uuid;
end $$;

create or replace function public.cancel_listing(p_listing uuid) returns void language plpgsql security definer set search_path=public as $$
declare listing market_listings;
begin
  select * into listing from market_listings where id=p_listing and seller_id=auth.uid() for update;
  if listing.id is null or listing.status<>'active' then raise exception 'listing_unavailable'; end if;
  perform adjust_inventory(auth.uid(),listing.item_id,listing.quantity);
  update market_listings set status='cancelled' where id=p_listing;
end $$;

create or replace function public.craft_item(p_recipe text,p_idempotency_key uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); recipe recipes; ingredient record; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=owner and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=owner and key=p_idempotency_key); end if;
  select * into recipe from recipes where id=p_recipe and active;
  if recipe.id is null or recipe.reputation_required>(select reputation_level from profiles where id=owner) then raise exception 'recipe_locked'; end if;
  for ingredient in select * from recipe_ingredients where recipe_id=p_recipe loop perform adjust_inventory(owner,ingredient.item_id,-ingredient.quantity); end loop;
  perform adjust_inventory(owner,recipe.output_item_id,recipe.output_quantity);
  result:=jsonb_build_object('item_id',recipe.output_item_id,'quantity',recipe.output_quantity);
  insert into idempotency_keys(owner_id,key,operation,result) values(owner,p_idempotency_key,'craft_item',result); return result;
end $$;

create or replace function public.start_game_run(p_game text) returns jsonb language plpgsql security definer set search_path=public as $$
declare run_id uuid:=gen_random_uuid(); run_seed bigint:=floor(random()*2147483647);
begin
  if p_game not in ('bloom-match','starwhisk-sprint') then raise exception 'invalid_game'; end if;
  insert into game_runs(id,owner_id,game_id,seed) values(run_id,auth.uid(),p_game,run_seed);
  return jsonb_build_object('run_id',run_id,'seed',run_seed,'started_at',now());
end $$;

create or replace function public.submit_game_run(p_run uuid,p_score integer,p_idempotency_key uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare run game_runs; elapsed numeric; reward integer; suspicious boolean; result jsonb;
begin
  if exists(select 1 from idempotency_keys where owner_id=auth.uid() and key=p_idempotency_key) then return (select idempotency_keys.result from idempotency_keys where owner_id=auth.uid() and key=p_idempotency_key); end if;
  select * into run from game_runs where id=p_run and owner_id=auth.uid() for update;
  if run.id is null or run.finished_at is not null then raise exception 'invalid_run'; end if;
  elapsed:=extract(epoch from now()-run.started_at); suspicious:=elapsed<20 or elapsed>180 or p_score<0 or p_score>2000; reward:=case when suspicious then 0 else least(90,greatest(10,floor(p_score/3))) end;
  update game_runs set finished_at=now(),score=p_score,reward=reward,suspicious=suspicious where id=p_run;
  if reward>0 then
    update wallets set balance=balance+reward,updated_at=now() where owner_id=auth.uid();
    insert into currency_ledger(owner_id,amount,reason,correlation_id) values(auth.uid(),reward,'game_reward',p_idempotency_key);
    update profiles set reputation_xp=reputation_xp+8 where id=auth.uid();
  end if;
  result:=jsonb_build_object('score',p_score,'reward',reward,'suspicious',suspicious);
  insert into idempotency_keys(owner_id,key,operation,result) values(auth.uid(),p_idempotency_key,'submit_game_run',result); return result;
end $$;

create or replace function public.equip_item(p_pet uuid,p_slot text,p_item text) returns public.pets language plpgsql security definer set search_path=public as $$
declare result pets;
begin
  if p_slot not in ('head','neck','held','background') or not exists(select 1 from inventory_stacks where owner_id=auth.uid() and item_id=p_item and quantity>0) then raise exception 'cannot_equip'; end if;
  update pets set equipped=jsonb_set(equipped,array[p_slot],to_jsonb(p_item)) where id=p_pet and owner_id=auth.uid() returning * into result;
  if result.id is null then raise exception 'pet_not_found'; end if; return result;
end $$;

create or replace function public.claim_daily_wish(p_idempotency_key uuid) returns integer language plpgsql security definer set search_path=public as $$
declare reward integer:=50+floor(random()*51);
begin
  insert into daily_wishes(owner_id,reward) values(auth.uid(),reward);
  update wallets set balance=balance+reward,updated_at=now() where owner_id=auth.uid();
  insert into currency_ledger(owner_id,amount,reason,correlation_id) values(auth.uid(),reward,'daily_wish',p_idempotency_key); return reward;
exception when unique_violation then raise exception 'already_claimed';
end $$;

create or replace function public.send_dm(p_friend uuid,p_body text) returns public.messages language plpgsql security definer set search_path=public as $$
declare thread uuid; result messages; clean text:=trim(regexp_replace(p_body,'https?://\\S+','[link removed]','gi'));
begin
  if not exists(select 1 from friendships where status='accepted' and ((requester_id=auth.uid() and addressee_id=p_friend) or (requester_id=p_friend and addressee_id=auth.uid()))) then raise exception 'friends_only'; end if;
  if exists(select 1 from blocks where (blocker_id in (auth.uid(),p_friend) and blocked_id in (auth.uid(),p_friend))) then raise exception 'blocked'; end if;
  select dp.thread_id into thread from dm_participants dp where dp.profile_id=auth.uid() and exists(select 1 from dm_participants other where other.thread_id=dp.thread_id and other.profile_id=p_friend) and (select count(*) from dm_participants allp where allp.thread_id=dp.thread_id)=2 limit 1;
  if thread is null then insert into dm_threads default values returning id into thread; insert into dm_participants(thread_id,profile_id) values(thread,auth.uid()),(thread,p_friend); end if;
  insert into messages(kind,author_id,thread_id,body) values('dm',auth.uid(),thread,left(clean,280)) returning * into result;
  insert into notifications(owner_id,kind,body) values(p_friend,'dm','You have a new message from a friend.'); return result;
end $$;

alter table public.profiles enable row level security; alter table public.pets enable row level security; alter table public.inventory_stacks enable row level security;
alter table public.collection_entries enable row level security; alter table public.wallets enable row level security; alter table public.currency_ledger enable row level security;
alter table public.market_listings enable row level security; alter table public.friendships enable row level security; alter table public.blocks enable row level security;
alter table public.chat_channels enable row level security; alter table public.dm_threads enable row level security; alter table public.dm_participants enable row level security;
alter table public.messages enable row level security; alter table public.reports enable row level security; alter table public.notifications enable row level security;
alter table public.item_definitions enable row level security; alter table public.species enable row level security; alter table public.palettes enable row level security; alter table public.recipes enable row level security; alter table public.recipe_ingredients enable row level security;

create policy "catalog readable" on public.item_definitions for select using(active); create policy "species readable" on public.species for select using(true); create policy "palettes readable" on public.palettes for select using(true); create policy "recipes readable" on public.recipes for select using(active); create policy "ingredients readable" on public.recipe_ingredients for select using(true);
create policy "profiles readable" on public.profiles for select using(banned_at is null); create policy "profile self update" on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy "pets readable" on public.pets for select using(true); create policy "own pets" on public.pets for all using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy "own inventory" on public.inventory_stacks for select using(owner_id=auth.uid()); create policy "own collection" on public.collection_entries for select using(owner_id=auth.uid());
create policy "own wallet" on public.wallets for select using(owner_id=auth.uid()); create policy "own ledger" on public.currency_ledger for select using(owner_id=auth.uid());
create policy "active listings readable" on public.market_listings for select using(status='active' or seller_id=auth.uid() or buyer_id=auth.uid());
create policy "own friendships" on public.friendships for select using(requester_id=auth.uid() or addressee_id=auth.uid()); create policy "create friendship" on public.friendships for insert with check(requester_id=auth.uid());
create policy "own blocks" on public.blocks for all using(blocker_id=auth.uid()) with check(blocker_id=auth.uid());
create policy "channels readable" on public.chat_channels for select using(active); create policy "public messages readable" on public.messages for select using(kind='public' and created_at>now()-interval '30 days');
create policy "dm participants read" on public.messages for select using(kind='dm' and exists(select 1 from dm_participants where thread_id=messages.thread_id and profile_id=auth.uid()) and created_at>now()-interval '90 days');
create policy "own reports" on public.reports for insert with check(reporter_id=auth.uid()); create policy "own notifications" on public.notifications for select using(owner_id=auth.uid()); create policy "own notifications update" on public.notifications for update using(owner_id=auth.uid());

grant execute on function public.buy_listing(uuid,uuid) to authenticated; grant execute on function public.care_pet(uuid,text) to authenticated; grant execute on function public.send_channel_message(text,text) to authenticated;
grant execute on function public.create_listing(text,integer,integer,uuid) to authenticated; grant execute on function public.cancel_listing(uuid) to authenticated;
grant execute on function public.craft_item(text,uuid) to authenticated; grant execute on function public.start_game_run(text) to authenticated; grant execute on function public.submit_game_run(uuid,integer,uuid) to authenticated;
grant execute on function public.equip_item(uuid,text,text) to authenticated; grant execute on function public.claim_daily_wish(uuid) to authenticated; grant execute on function public.send_dm(uuid,text) to authenticated;
revoke execute on function public.adjust_inventory(uuid,text,integer) from public,anon,authenticated;
