create or replace function public.confirm_paid_order_and_decrement_stock(
  p_order_id uuid,
  p_payment_id text,
  p_signature text default null
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.store_orders%rowtype;
  item jsonb;
  pid uuid;
  qty integer;
  updated_count integer;
begin
  select * into order_row from public.store_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  if exists(select 1 from public.store_stock_adjustments where order_id=p_order_id) then
    return true;
  end if;

  -- Coupon usage, stock deduction and paid status commit or roll back together.
  if not public.claim_promo_usage_for_order(p_order_id) then
    raise exception 'Promotion is no longer available for this payment';
  end if;

  for item in select value from jsonb_array_elements(order_row.items) loop
    pid := (item->>'product_id')::uuid;
    qty := (item->>'quantity')::integer;
    if qty is null or qty < 1 then raise exception 'Invalid order quantity'; end if;
    update public.products set stock_quantity=stock_quantity-qty
      where id=pid and stock_quantity>=qty;
    get diagnostics updated_count = row_count;
    if updated_count <> 1 then raise exception 'Insufficient stock for product %', pid; end if;
  end loop;

  insert into public.store_stock_adjustments(order_id,payment_id) values(p_order_id,p_payment_id);
  update public.store_orders set payment_status='paid', status='confirmed',
    razorpay_payment_id=p_payment_id, razorpay_signature=p_signature
    where id=p_order_id;
  return true;
end;
$$;

revoke all on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) from public, anon, authenticated;
grant execute on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) to service_role;