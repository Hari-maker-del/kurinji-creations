create table if not exists public.store_loyalty_accounts (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  customer_name text not null,
  email text,
  points_balance integer not null default 0 check (points_balance >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  tier text not null default 'bronze' check (tier in ('bronze','silver','gold','platinum')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.store_loyalty_accounts(id) on delete cascade,
  order_id uuid references public.store_orders(id) on delete set null,
  points integer not null,
  event_type text not null check (event_type in ('order_reward','admin_adjustment')),
  description text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists store_loyalty_order_reward_once on public.store_loyalty_ledger(order_id) where event_type='order_reward' and order_id is not null;
create index if not exists store_loyalty_ledger_account_created on public.store_loyalty_ledger(account_id,created_at desc);
alter table public.store_loyalty_accounts enable row level security;
alter table public.store_loyalty_ledger enable row level security;
drop policy if exists "Admins can view loyalty accounts" on public.store_loyalty_accounts;
create policy "Admins can view loyalty accounts" on public.store_loyalty_accounts for select to authenticated using (exists(select 1 from public.store_admins a where a.user_id=auth.uid()));
drop policy if exists "Admins can view loyalty ledger" on public.store_loyalty_ledger;
create policy "Admins can view loyalty ledger" on public.store_loyalty_ledger for select to authenticated using (exists(select 1 from public.store_admins a where a.user_id=auth.uid()));
grant select on public.store_loyalty_accounts, public.store_loyalty_ledger to authenticated;
revoke all on public.store_loyalty_accounts, public.store_loyalty_ledger from anon;
create or replace function public.confirm_paid_order_and_decrement_stock(p_order_id uuid,p_payment_id text,p_signature text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare order_row public.store_orders%rowtype; item jsonb; pid uuid; qty integer; product_row public.products%rowtype; account_row public.store_loyalty_accounts%rowtype; earned integer; normalized_phone text;
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
   insert into public.store_loyalty_accounts(phone,customer_name,email) values(normalized_phone,order_row.customer_name,order_row.email)
   on conflict(phone) do update set customer_name=excluded.customer_name,email=coalesce(excluded.email,store_loyalty_accounts.email),updated_at=now() returning * into account_row;
   update public.store_loyalty_accounts set points_balance=points_balance+earned,lifetime_points=lifetime_points+earned,
    tier=case when lifetime_points+earned>=3000 then 'platinum' when lifetime_points+earned>=1500 then 'gold' when lifetime_points+earned>=500 then 'silver' else 'bronze' end,updated_at=now()
    where id=account_row.id;
   insert into public.store_loyalty_ledger(account_id,order_id,points,event_type,description) values(account_row.id,p_order_id,earned,'order_reward','Reward for paid order #'||order_row.order_number);
  end if;
 end if;
 return true;
end; $$;
revoke all on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) from public,anon,authenticated;
grant execute on function public.confirm_paid_order_and_decrement_stock(uuid,text,text) to service_role;
create or replace function public.adjust_store_loyalty_points(p_account_id uuid,p_points integer,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare a public.store_loyalty_accounts%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.store_admins where user_id=auth.uid()) then raise exception 'Not authorized'; end if;
 if p_points=0 or abs(p_points)>100000 or length(trim(coalesce(p_reason,'')))<3 then raise exception 'Enter a valid points adjustment and reason'; end if;
 select * into a from public.store_loyalty_accounts where id=p_account_id for update;
 if not found then raise exception 'Loyalty account not found'; end if;
 if a.points_balance+p_points<0 then raise exception 'Adjustment exceeds available points'; end if;
 update public.store_loyalty_accounts set points_balance=points_balance+p_points,lifetime_points=greatest(0,lifetime_points+greatest(p_points,0)),
  tier=case when lifetime_points+greatest(p_points,0)>=3000 then 'platinum' when lifetime_points+greatest(p_points,0)>=1500 then 'gold' when lifetime_points+greatest(p_points,0)>=500 then 'silver' else 'bronze' end,updated_at=now() where id=p_account_id;
 insert into public.store_loyalty_ledger(account_id,points,event_type,description) values(p_account_id,p_points,'admin_adjustment',trim(p_reason));
 return true;
end; $$;
revoke all on function public.adjust_store_loyalty_points(uuid,integer,text) from public,anon;
grant execute on function public.adjust_store_loyalty_points(uuid,integer,text) to authenticated;