-- Qualify the idempotency result column and re-check it after locking the
-- listing so concurrent retries cannot perform the purchase twice.
create or replace function public.buy_listing(
  p_listing uuid,
  p_idempotency_key uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer uuid := auth.uid();
  listing_row public.market_listings;
  total bigint;
  fee bigint;
  prior_result jsonb;
  purchase_result jsonb;
begin
  if buyer is null then
    raise exception 'authentication_required';
  end if;

  select ik.result
  into prior_result
  from public.idempotency_keys as ik
  where ik.owner_id = buyer
    and ik.key = p_idempotency_key;

  if found then
    return prior_result;
  end if;

  select ml.*
  into listing_row
  from public.market_listings as ml
  where ml.id = p_listing
  for update;

  -- A request with the same key may have completed while this transaction
  -- waited for the listing lock.
  select ik.result
  into prior_result
  from public.idempotency_keys as ik
  where ik.owner_id = buyer
    and ik.key = p_idempotency_key;

  if found then
    return prior_result;
  end if;

  if listing_row.id is null
    or listing_row.status <> 'active'
    or listing_row.expires_at <= now()
  then
    raise exception 'listing_unavailable';
  end if;

  if listing_row.seller_id = buyer then
    raise exception 'cannot_buy_own_listing';
  end if;

  total := listing_row.unit_price * listing_row.quantity;
  fee := ceil(total * .05);

  update public.wallets
  set balance = balance - total,
      updated_at = now()
  where owner_id = buyer
    and balance >= total;

  if not found then
    raise exception 'insufficient_funds';
  end if;

  update public.wallets
  set balance = balance + total - fee,
      updated_at = now()
  where owner_id = listing_row.seller_id;

  perform public.adjust_inventory(buyer, listing_row.item_id, listing_row.quantity);

  update public.market_listings
  set status = 'sold',
      buyer_id = buyer,
      sold_at = now()
  where id = listing_row.id;

  insert into public.currency_ledger (owner_id, amount, reason, correlation_id)
  values
    (buyer, -total, 'market_purchase', p_idempotency_key),
    (listing_row.seller_id, total - fee, 'market_sale', p_idempotency_key);

  insert into public.notifications (owner_id, kind, body)
  values (listing_row.seller_id, 'market_sale', 'One of your marketplace listings sold.');

  purchase_result := jsonb_build_object(
    'listing_id', listing_row.id,
    'item_id', listing_row.item_id,
    'quantity', listing_row.quantity,
    'total', total
  );

  insert into public.idempotency_keys (owner_id, key, operation, result)
  values (buyer, p_idempotency_key, 'buy_listing', purchase_result);

  return purchase_result;
end
$$;

grant execute on function public.buy_listing(uuid, uuid) to authenticated;
