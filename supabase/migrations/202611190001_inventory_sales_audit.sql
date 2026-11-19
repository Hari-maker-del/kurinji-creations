alter table public.store_inventory_logs
  add column if not exists event_type text not null default 'manual_adjustment',
  add column if not exists order_id uuid references public.store_orders(id) on delete set null;

grant select on public.store_inventory_logs to authenticated;
drop policy if exists "Admins can view inventory history" on public.store_inventory_logs;
create policy "Admins can view inventory history"
on public.store_inventory_logs for select to authenticated
using (exists (select 1 from public.store_admins a where a.user_id = auth.uid()));

create or replace function public.confirm_paid_order_and_decrement_stock(
  p_order_id uuid,
  p_payment_id text,
  p_signature text default null
) returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  order_row public.store_orders%rowtype;
  item jsonb;
  pid uuid;
  qty integer;
  product_row public.products%rowtype;
begin
  select * into order_row from public.store_orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if exists(select 1 from public.store_stock_adjustments where order_id=p_order_id) then
    return true;
  end if;

  for item in select value from jsonb_array_elements(order_row.items) loop
    pid := (item->>'product_id')::uuid;
    qty := (item->>'quantity')::integer;
    if qty is null or qty < 1 then raise exception 'Invalid order quantity'; end if;

    update public.products
      set stock_quantity=stock_quantity-qty
      where id=pid and stock_quantity>=qty
      returning * into product_row;
    if not found then raise exception 'Insufficient stock for product %', pid; end if;

    insert into public.store_inventory_logs(
      product_id, product_name, adjustment, previous_stock, new_stock,
      reason, changed_by, event_type, order_id
    ) values (
      pid, product_row.name, -qty, product_row.stock_quantity+qty,
      product_row.stock_quantity, 'Paid order #'||order_row.order_number,
      null, 'sale', p_order_id
    );
  end loop;

  insert into public.store_stock_adjustments(order_id,payment_id)
    values(p_order_id,p_payment_id);
  update public.store_orders set payment_status='paid', status='confirmed',
    razorpay_payment_id=p_payment_id, razorpay_signature=p_signature
    where id=p_order_id;
  return true;
end;
$$;

revoke all on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) from public, anon, authenticated;
grant execute on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) to service_role;
