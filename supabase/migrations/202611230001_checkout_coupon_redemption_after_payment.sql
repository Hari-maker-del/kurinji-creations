create table if not exists public.store_promo_redemptions (
  order_id uuid primary key references public.store_orders(id) on delete cascade,
  promo_code text not null references public.promo_codes(code),
  redeemed_at timestamptz not null default now()
);

alter table public.store_promo_redemptions enable row level security;
revoke all on public.store_promo_redemptions from anon, authenticated;

create or replace function public.claim_promo_usage_for_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  select coupon_code into v_code
    from public.store_orders
   where id = p_order_id
   for update;

  if not found then return false; end if;
  if v_code is null or v_code = '' then return true; end if;
  if exists (select 1 from public.store_promo_redemptions where order_id = p_order_id) then return true; end if;

  update public.promo_codes
     set usage_count = usage_count + 1, updated_at = now()
   where code = upper(trim(v_code))
     and is_active = true
     and (usage_limit is null or usage_count < usage_limit)
     and (starts_at is null or starts_at <= now())
     and (ends_at is null or ends_at >= now());

  if not found then return false; end if;
  insert into public.store_promo_redemptions(order_id, promo_code)
  values (p_order_id, upper(trim(v_code)));
  return true;
end;
$$;

create or replace function public.release_promo_usage_for_order(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  delete from public.store_promo_redemptions
   where order_id = p_order_id
   returning promo_code into v_code;
  if v_code is null then return true; end if;
  update public.promo_codes
     set usage_count = greatest(0, usage_count - 1), updated_at = now()
   where code = v_code;
  return true;
end;
$$;

revoke all on function public.claim_promo_usage_for_order(uuid) from public, anon, authenticated;
revoke all on function public.release_promo_usage_for_order(uuid) from public, anon, authenticated;
grant execute on function public.claim_promo_usage_for_order(uuid) to service_role;
grant execute on function public.release_promo_usage_for_order(uuid) to service_role;