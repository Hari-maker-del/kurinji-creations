create table if not exists public.store_inventory_logs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  adjustment integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);
alter table public.store_inventory_logs enable row level security;
revoke all on public.store_inventory_logs from anon, authenticated;
grant select, insert on public.store_inventory_logs to service_role;

create or replace function public.adjust_store_inventory(
  p_product_id uuid,
  p_adjustment integer,
  p_reason text
) returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  product_row public.products%rowtype;
  new_quantity integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.store_admins where user_id=auth.uid()
  ) then
    raise exception 'Admin access required';
  end if;
  if p_adjustment=0 or length(trim(coalesce(p_reason,'')))=0 then
    raise exception 'Adjustment and reason are required';
  end if;
  select * into product_row from public.products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  new_quantity := product_row.stock_quantity + p_adjustment;
  if new_quantity < 0 then raise exception 'Stock cannot be negative'; end if;
  update public.products set stock_quantity=new_quantity where id=p_product_id;
  insert into public.store_inventory_logs(product_id,product_name,adjustment,previous_stock,new_stock,reason,changed_by)
  values(p_product_id,product_row.name,p_adjustment,product_row.stock_quantity,new_quantity,trim(p_reason),auth.uid());
  return new_quantity;
end;
$$;
revoke all on function public.adjust_store_inventory(uuid,integer,text) from public, anon;
grant execute on function public.adjust_store_inventory(uuid,integer,text) to authenticated;
