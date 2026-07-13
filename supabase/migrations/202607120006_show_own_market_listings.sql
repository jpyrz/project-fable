-- Sellers should see their own active escrow listings in the marketplace feed.
create or replace function public.get_game_snapshot() returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    'listings',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'item_id',l.item_id,'seller',p.username,'price',l.unit_price*l.quantity,'quantity',l.quantity) order by l.created_at desc) from market_listings l join profiles p on p.id=l.seller_id where l.status='active' and l.expires_at>now()),'[]'::jsonb),
    'messages',coalesce((select jsonb_agg(x.payload order by x.created_at) from (select m.created_at,jsonb_build_object('id',m.id,'channel',case when m.kind='public' then case when m.channel_id='off-topic' then 'Off-topic' else initcap(m.channel_id) end else 'DM:'||(select op.username from dm_participants dp join profiles op on op.id=dp.profile_id where dp.thread_id=m.thread_id and dp.profile_id<>owner limit 1) end,'author',a.username,'body',m.body,'time',to_char(m.created_at at time zone 'utc','HH24:MI'),'own',m.author_id=owner) payload from messages m join profiles a on a.id=m.author_id where m.deleted_at is null and not exists(select 1 from blocks b where (b.blocker_id=owner and b.blocked_id=m.author_id) or (b.blocker_id=m.author_id and b.blocked_id=owner)) and ((m.kind='public' and m.created_at>now()-interval '30 days') or (m.kind='dm' and m.created_at>now()-interval '90 days' and exists(select 1 from dm_participants dp where dp.thread_id=m.thread_id and dp.profile_id=owner))) order by m.created_at desc limit 150) x),'[]'::jsonb),
    'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'text',n.body,'read',n.read_at is not null) order by n.created_at desc) from notifications n where n.owner_id=owner),'[]'::jsonb),
    'tasks',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'label',t.label,'progress',coalesce(c.progress,0),'target',t.target,'reward',t.reward,'claimed',c.claimed_at is not null) order by t.id) from daily_tasks t left join task_completions c on c.task_id=t.id and c.owner_id=owner and c.task_date=(now() at time zone 'utc')::date where t.active),'[]'::jsonb),
    'daily_wish_claimed',exists(select 1 from daily_wishes d where d.owner_id=owner and d.wish_date=(now() at time zone 'utc')::date),
    'friends',coalesce((select jsonb_agg(jsonb_build_object('id',f.friend_id,'name',p.username,'pet',coalesce(pet.name,'No active Fable'),'online',false) order by p.username) from (select case when requester_id=owner then addressee_id else requester_id end friend_id from friendships where status='accepted' and owner in (requester_id,addressee_id)) f join profiles p on p.id=f.friend_id left join pets pet on pet.id=p.active_pet_id),'[]'::jsonb),
    'friend_requests',coalesce((select jsonb_agg(jsonb_build_object('requester_id',f.requester_id,'name',p.username) order by f.created_at) from friendships f join profiles p on p.id=f.requester_id where f.addressee_id=owner and f.status='pending'),'[]'::jsonb)
  ) into result;
  return result;
end
$$;

grant execute on function public.get_game_snapshot() to authenticated;
