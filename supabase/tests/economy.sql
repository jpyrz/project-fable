begin;
select plan(7);

select has_table('public','currency_ledger','ledger exists');
select has_function('public','buy_listing',array['uuid','uuid'],'atomic purchase RPC exists');
select has_function('public','submit_game_run',array['uuid','integer','uuid'],'validated game submission exists');
select col_is_pk('public','idempotency_keys',array['owner_id','key'],'idempotency keys are unique per owner');
select has_function('public','get_game_snapshot',array[]::text[],'snapshot RPC exists');
select has_function('public','complete_onboarding',array['text','text','text','integer'],'onboarding RPC exists');
select has_function('public','hook_require_invite',array['jsonb'],'invite auth hook exists');

select * from finish();
rollback;
