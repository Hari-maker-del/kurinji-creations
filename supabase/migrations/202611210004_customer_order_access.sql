create or replace function public.get_my_store_orders()
returns table(
 id uuid, order_number bigint, customer_name text, phone text, items jsonb,
 subtotal_paise integer, discount_paise integer, loyalty_discount_paise integer,
 loyalty_points_redeemed integer, coupon_code text, status text, payment_status text, created_at timestamptz
)
language sql stable security definer set search_path=public as $$
 select o.id,o.order_number,o.customer_name,o.phone,o.items,o.subtotal_paise,
  coalesce(o.discount_paise,0),coalesce(o.loyalty_discount_paise,0),coalesce(o.loyalty_points_redeemed,0),
  o.coupon_code,o.status,o.payment_status,o.created_at
 from public.store_orders o
 where auth.uid() is not null
 and length(regexp_replace(coalesce(auth.jwt()->>'phone',''),'[^0-9]','','g'))>=10
 and right(regexp_replace(coalesce(o.phone,''),'[^0-9]','','g'),10)
     = right(regexp_replace(coalesce(auth.jwt()->>'phone',''),'[^0-9]','','g'),10)
 order by o.created_at desc limit 100
$$;
revoke all on function public.get_my_store_orders() from public,anon;
grant execute on function public.get_my_store_orders() to authenticated;
