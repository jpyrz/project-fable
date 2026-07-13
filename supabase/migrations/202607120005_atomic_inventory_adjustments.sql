-- Make inventory removal a single guarded write. This prevents concurrent
-- listing/crafting requests from ever crossing the quantity >= 0 constraint.
create or replace function public.adjust_inventory(
  p_owner uuid,
  p_item text,
  p_delta integer
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_delta < 0 then
    update public.inventory_stacks
    set quantity = quantity + p_delta,
        updated_at = now()
    where owner_id = p_owner
      and item_id = p_item
      and quantity >= -p_delta;

    if not found then
      raise exception using
        errcode = 'P0001',
        message = 'insufficient_inventory';
    end if;
  elsif p_delta > 0 then
    insert into public.inventory_stacks (owner_id, item_id, quantity)
    values (p_owner, p_item, p_delta)
    on conflict (owner_id, item_id) do update
    set quantity = public.inventory_stacks.quantity + excluded.quantity,
        updated_at = now();
  else
    return;
  end if;

  insert into public.collection_entries (owner_id, item_id)
  values (p_owner, p_item)
  on conflict do nothing;
end
$$;

revoke execute on function public.adjust_inventory(uuid, text, integer) from public, anon, authenticated;
