-- The Git-deployed client may briefly lag behind database migrations. Keep the
-- retired Play care action compatible during that window; it never awards
-- Bond XP, which remains exclusive to validated arcade completions.
create or replace function public.care_pet(p_pet uuid,p_kind text) returns public.pets
language plpgsql security definer set search_path=public as $$
declare result pets; elapsed_seconds numeric;
begin
  if p_kind not in ('groom','play') then raise exception 'play_in_arcade_or_choose_food'; end if;
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

revoke execute on function public.care_pet(uuid,text) from public,anon;
grant execute on function public.care_pet(uuid,text) to authenticated;
