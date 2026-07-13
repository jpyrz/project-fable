-- Promote the initial Project Fable owner account.
do $$
begin
  update public.profiles
  set role = 'admin'
  where lower(username) = 'cutemoms';

  if not found then
    raise exception 'Keeper cutemoms does not exist; complete signup before applying this migration.';
  end if;
end
$$;
