-- Prefix all local values so PostgreSQL never has to choose between a
-- PL/pgSQL variable and a game_runs column during reward settlement.
create or replace function public.submit_game_run(
  p_run uuid,
  p_score integer,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run public.game_runs%rowtype;
  v_elapsed numeric;
  v_minimum_elapsed numeric;
  v_reward integer;
  v_suspicious boolean;
  v_result jsonb;
  v_material text;
begin
  if exists (
    select 1
    from public.idempotency_keys as ik
    where ik.owner_id = auth.uid()
      and ik.key = p_idempotency_key
  ) then
    return (
      select ik.result
      from public.idempotency_keys as ik
      where ik.owner_id = auth.uid()
        and ik.key = p_idempotency_key
    );
  end if;

  select gr.*
  into v_run
  from public.game_runs as gr
  where gr.id = p_run
    and gr.owner_id = auth.uid()
  for update;

  if v_run.id is null or v_run.finished_at is not null then
    raise exception 'invalid_run';
  end if;

  v_elapsed := extract(epoch from now() - v_run.started_at);
  v_minimum_elapsed := case
    when v_run.game_id = 'bloom-match' and p_score = 300 then 3
    else 20
  end;
  v_suspicious := v_elapsed < v_minimum_elapsed
    or v_elapsed > 180
    or p_score < 0
    or p_score > 2000;
  v_reward := case
    when v_suspicious then 0
    else least(90, greatest(10, floor(p_score / 3)))
  end;
  v_material := case when mod(p_score, 2) = 0 then 'item-10' else 'item-11' end;

  update public.game_runs as gr
  set finished_at = now(),
      score = p_score,
      reward = v_reward,
      suspicious = v_suspicious
  where gr.id = p_run;

  if v_reward > 0 then
    update public.wallets as w
    set balance = w.balance + v_reward,
        updated_at = now()
    where w.owner_id = auth.uid();

    insert into public.currency_ledger (owner_id, amount, reason, correlation_id)
    values (auth.uid(), v_reward, 'game_reward', p_idempotency_key);

    update public.profiles as p
    set reputation_xp = p.reputation_xp + 8,
        reputation_level = greatest(p.reputation_level, floor((p.reputation_xp + 8) / 100) + 1)
    where p.id = auth.uid();

    perform public.adjust_inventory(auth.uid(), v_material, 1);
    perform public.increment_daily_task(auth.uid(), 'play', 1);
    perform public.increment_daily_task(auth.uid(), 'collect', 1);
  end if;

  v_result := jsonb_build_object(
    'score', p_score,
    'reward', v_reward,
    'suspicious', v_suspicious,
    'item_id', case when v_reward > 0 then v_material else null end
  );

  insert into public.idempotency_keys (owner_id, key, operation, result)
  values (auth.uid(), p_idempotency_key, 'submit_game_run', v_result);

  return v_result;
end
$$;

grant execute on function public.submit_game_run(uuid, integer, uuid) to authenticated;
