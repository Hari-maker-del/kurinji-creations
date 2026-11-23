create or replace function public.release_promo_usage_for_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_payment_status text;
begin
  select payment_status into v_payment_status
    from public.store_orders
   where id = p_order_id
   for update;

  if not found then return true; end if;
  if v_payment_status = 'paid' then return true; end if;

  delete from public.store_promo_redemptions
   where order_id = p_order_id
   returning promo_code into v_code;

  if v_code is null then return true; end if;
  update public.promo_codes
     set usage_count = greatest(0, usage_count - 1),
         updated_at = now()
   where code = v_code;
  return true;
end;
$$;

revoke all on function public.release_promo_usage_for_order(uuid) from public, anon, authenticated;
grant execute on function public.release_promo_usage_for_order(uuid) to service_role;