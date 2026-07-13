-- Make arcade completion resilient and allow a legitimately cleared Bloom board
-- to finish before the standard reflex-game minimum duration.
create or replace function public.increment_daily_task(p_owner uuid,p_task text,p_amount integer default 1) returns void
language plpgsql security definer set search_path=public as $$
declare selected_task_id text; selected_target integer;
begin
  select id,target into selected_task_id,selected_target from daily_tasks
  where task_kind=p_task and rotation_slot=public.daily_rotation_slot() and active
  limit 1;
  if selected_task_id is null then return; end if;
  insert into task_completions(owner_id,task_id,progress)
  values(p_owner,selected_task_id,least(selected_target,greatest(0,p_amount)))
  on conflict(owner_id,task_id,task_date) do update
  set progress=least(selected_target,task_completions.progress+greatest(0,p_amount));
end $$;
revoke execute on function public.increment_daily_task(uuid,text,integer) from public,anon,authenticated;

create or replace function public.submit_game_run(p_run uuid,p_score integer,p_idempotency_key uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare
  run game_runs;
  elapsed numeric;
  minimum_elapsed numeric;
  reward integer;
  suspicious boolean;
  result jsonb;
  material text;
begin
  if exists(select 1 from idempotency_keys where owner_id=auth.uid() and key=p_idempotency_key) then
    return (select idempotency_keys.result from idempotency_keys where owner_id=auth.uid() and key=p_idempotency_key);
  end if;
  select * into run from game_runs where id=p_run and owner_id=auth.uid() for update;
  if run.id is null or run.finished_at is not null then raise exception 'invalid_run'; end if;
  elapsed:=extract(epoch from now()-run.started_at);
  minimum_elapsed:=case when run.game_id='bloom-match' and p_score=300 then 3 else 20 end;
  suspicious:=elapsed<minimum_elapsed or elapsed>180 or p_score<0 or p_score>2000;
  reward:=case when suspicious then 0 else least(90,greatest(10,floor(p_score/3))) end;
  material:=case when mod(p_score,2)=0 then 'item-10' else 'item-11' end;
  update game_runs set finished_at=now(),score=p_score,reward=reward,suspicious=suspicious where id=p_run;
  if reward>0 then
    update wallets set balance=balance+reward,updated_at=now() where owner_id=auth.uid();
    insert into currency_ledger(owner_id,amount,reason,correlation_id) values(auth.uid(),reward,'game_reward',p_idempotency_key);
    update profiles set reputation_xp=reputation_xp+8,reputation_level=greatest(reputation_level,floor((reputation_xp+8)/100)+1) where id=auth.uid();
    perform adjust_inventory(auth.uid(),material,1);
    perform increment_daily_task(auth.uid(),'play',1);
    perform increment_daily_task(auth.uid(),'collect',1);
  end if;
  result:=jsonb_build_object('score',p_score,'reward',reward,'suspicious',suspicious,'item_id',case when reward>0 then material else null end);
  insert into idempotency_keys(owner_id,key,operation,result) values(auth.uid(),p_idempotency_key,'submit_game_run',result);
  return result;
end $$;
grant execute on function public.submit_game_run(uuid,integer,uuid) to authenticated;
