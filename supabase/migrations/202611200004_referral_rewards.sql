alter table public.store_loyalty_accounts
 add column if not exists referral_code text;
update public.store_loyalty_accounts set referral_code='KC'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)) where referral_code is null;
alter table public.store_loyalty_accounts alter column referral_code set default ('KC'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
alter table public.store_loyalty_accounts alter column referral_code set not null;
create unique index if not exists store_loyalty_referral_code_unique on public.store_loyalty_accounts(referral_code);
alter table public.store_orders add column if not exists referral_code text, add column if not exists referrer_account_id uuid references public.store_loyalty_accounts(id) on delete set null;
create table if not exists public.store_referrals (
 id uuid primary key default gen_random_uuid(),
 referrer_account_id uuid not null references public.store_loyalty_accounts(id) on delete cascade,
 referred_account_id uuid not null references public.store_loyalty_accounts(id) on delete cascade,
 qualifying_order_id uuid not null references public.store_orders(id) on delete cascade,
 referral_code text not null,
 referrer_points integer not null default 100,
 referred_points integer not null default 50,
 created_at timestamptz not null default now(),
 constraint store_referrals_not_self check(referrer_account_id<>referred_account_id),
 constraint store_referrals_referred_once unique(referred_account_id),
 constraint store_referrals_order_once unique(qualifying_order_id)
);
alter table public.store_referrals enable row level security;
drop policy if exists "Admins can view referrals" on public.store_referrals;
create policy "Admins can view referrals" on public.store_referrals for select to authenticated using(exists(select 1 from public.store_admins a where a.user_id=auth.uid()));
grant select on public.store_referrals to authenticated;
revoke all on public.store_referrals from anon;
create or replace function public.validate_store_referral_code(p_code text,p_phone text)
returns table(referrer_account_id uuid,referral_code text) language plpgsql security definer set search_path=public as $$
declare normalized_phone text;
begin
 normalized_phone:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
 return query select a.id,a.referral_code from public.store_loyalty_accounts a
 where a.referral_code=upper(regexp_replace(coalesce(p_code,''),'\s','','g'))
 and length(normalized_phone)>=8 and a.phone<>normalized_phone
 and not exists(select 1 from public.store_loyalty_accounts existing where existing.phone=normalized_phone) limit 1;
end; $$;
revoke all on function public.validate_store_referral_code(text,text) from public,anon,authenticated;
grant execute on function public.validate_store_referral_code(text,text) to service_role;
-- The paid-order function retains the existing idempotent stock and points processing, then
-- awards 100 referrer points and 50 new-customer points only on the referred customer's first paid order.
create or replace function public.confirm_paid_order_and_decrement_stock(p_order_id uuid,p_payment_id text,p_signature text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare
 order_row public.store_orders%rowtype; item jsonb; pid uuid; qty integer; product_row public.products%rowtype;
 account_row public.store_loyalty_accounts%rowtype; referrer_row public.store_loyalty_accounts%rowtype;
 earned integer; normalized_phone text; is_new_account boolean;
begin
 select * into order_row from public.store_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if not exists(select 1 from public.store_stock_adjustments where order_id=p_order_id) then
  for item in select value from jsonb_array_elements(order_row.items) loop
   pid:=(item->>'product_id')::uuid; qty:=(item->>'quantity')::integer;
   if qty is null or qty<1 then raise exception 'Invalid order quantity'; end if;
   update public.products set stock_quantity=stock_quantity-qty where id=pid and stock_quantity>=qty returning * into product_row;
   if not found then raise exception 'Insufficient stock for product %',pid; end if;
   insert into public.store_inventory_logs(product_id,product_name,adjustment,previous_stock,new_stock,reason,changed_by,event_type,order_id)
   values(pid,product_row.name,-qty,product_row.stock_quantity+qty,product_row.stock_quantity,'Paid order #'||order_row.order_number,null,'sale',p_order_id);
  end loop;
  insert into public.store_stock_adjustments(order_id,payment_id) values(p_order_id,p_payment_id);
 end if;
 update public.store_orders set payment_status='paid',status='confirmed',razorpay_payment_id=coalesce(razorpay_payment_id,p_payment_id),razorpay_signature=coalesce(razorpay_signature,p_signature) where id=p_order_id;
 if not exists(select 1 from public.store_loyalty_ledger where order_id=p_order_id and event_type='order_reward') then
  normalized_phone:=regexp_replace(coalesce(order_row.phone,''),'[^0-9]','','g');
  earned:=greatest(0,floor((order_row.subtotal_paise-coalesce(order_row.discount_paise,0))::numeric/10000)::integer);
  if length(normalized_phone)>=8 and earned>0 then
   select exists(select 1 from public.store_loyalty_accounts where phone=normalized_phone) into is_new_account;
   insert into public.store_loyalty_accounts(phone,customer_name,email) values(normalized_phone,order_row.customer_name,order_row.email)
   on conflict(phone) do update set customer_name=excluded.customer_name,email=coalesce(excluded.email,store_loyalty_accounts.email),updated_at=now() returning * into account_row;
   update public.store_loyalty_accounts set points_balance=points_balance+earned,lifetime_points=lifetime_points+earned,
    tier=case when lifetime_points+earned>=3000 then 'platinum' when lifetime_points+earned>=1500 then 'gold' when lifetime_points+earned>=500 then 'silver' else 'bronze' end,updated_at=now() where id=account_row.id;
   insert into public.store_loyalty_ledger(account_id,order_id,points,event_type,description) values(account_row.id,p_order_id,earned,'order_reward','Reward for paid order #'||order_row.order_number);
   if is_new_account and order_row.referrer_account_id is not null and order_row.referrer_account_id<>account_row.id
      and not exists(select 1 from public.store_referrals where referred_account_id=account_row.id) then
    select * into referrer_row from public.store_loyalty_accounts where id=order_row.referrer_account_id for update;
    if found then
     update public.store_loyalty_accounts set points_balance=points_balance+50,lifetime_points=lifetime_points+50,
      tier=case when lifetime_points+50>=3000 then 'platinum' when lifetime_points+50>=1500 then 'gold' when lifetime_points+50>=500 then 'silver' else 'bronze' end,updated_at=now() where id=account_row.id;
     update public.store_loyalty_accounts set points_balance=points_balance+100,lifetime_points=lifetime_points+100,
      tier=case when lifetime_points+100>=3000 then 'platinum' when lifetime_points+100>=1500 then 'gold' when lifetime_points+100>=500 then 'silver' else 'bronze' end,updated_at=now() where id=referrer_row.id;
     insert into public.store_referrals(referrer_account_id,referred_account_id,qualifying_order_id,referral_code) values(referrer_row.id,account_row.id,p_order_id,order_row.referral_code);
     insert into public.store_loyalty_ledger(account_id,order_id,points,event_type,description) values(account_row.id,p_order_id,50,'admin_adjustment','New customer referral bonus');
     insert into public.store_loyalty_ledger(account_id,order_id,points,event_type,description) values(referrer_row.id,p_order_id,100,'admin_adjustment','Successful referral bonus');
    end if;
   end if;
  end if;
 end if;
 return true;
end; $$;
revoke all on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) from public,anon,authenticated;
grant execute on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) to service_role;