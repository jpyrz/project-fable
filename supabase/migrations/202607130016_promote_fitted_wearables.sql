-- Item-backed fitted wearables belong to the layered appearance system, not
-- the legacy emoji equipment renderer.

update public.pets
set appearance=jsonb_set(appearance,'{head}',to_jsonb('mossling-head-sunhat'::text)),
    equipped=equipped-'head'
where species_id='mossling'
  and equipped->>'head'='item-16';

create or replace function public.equip_item(p_pet uuid,p_slot text,p_item text) returns public.pets
language plpgsql security definer set search_path=public as $$
declare result pets; fitted_id text; fitted_slot text;
begin
  if p_slot not in ('head','neck','held','background')
    or not exists(select 1 from inventory_stacks where owner_id=auth.uid() and item_id=p_item and quantity>0)
  then raise exception 'cannot_equip'; end if;

  select d.id,d.slot into fitted_id,fitted_slot
  from customization_definitions d
  join pets p on p.id=p_pet and p.owner_id=auth.uid() and p.species_id=d.species_id
  where d.item_id=p_item and d.active
  limit 1;

  if fitted_id is not null then
    update pets
    set appearance=jsonb_set(appearance,array[fitted_slot],to_jsonb(fitted_id)),
        equipped=equipped-p_slot
    where id=p_pet and owner_id=auth.uid()
    returning * into result;
  else
    update pets
    set equipped=jsonb_set(equipped,array[p_slot],to_jsonb(p_item))
    where id=p_pet and owner_id=auth.uid()
    returning * into result;
  end if;

  if result.id is null then raise exception 'pet_not_found'; end if;
  return result;
end $$;

revoke execute on function public.equip_item(uuid,text,text) from public,anon;
grant execute on function public.equip_item(uuid,text,text) to authenticated;
