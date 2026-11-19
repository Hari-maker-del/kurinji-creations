create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value integer not null check (discount_value > 0),
  min_order_paise integer not null default 0 check (min_order_paise >= 0),
  max_discount_paise integer,
  usage_limit integer,
  usage_count integer not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((discount_type <> 'percent') or discount_value <= 100),
  check (max_discount_paise is null or max_discount_paise >= 0),
  check (usage_limit is null or usage_limit > 0)
);
create index if not exists promo_codes_active_code_idx on public.promo_codes (code) where is_active = true;
alter table public.promo_codes enable row level security;
drop policy if exists "Store admins can manage promo codes" on public.promo_codes;
create policy "Store admins can manage promo codes" on public.promo_codes
  for all to authenticated
  using (exists (select 1 from public.store_admins sa where sa.user_id = (select auth.uid())))
  with check (exists (select 1 from public.store_admins sa where sa.user_id = (select auth.uid())));
grant select, insert, update, delete on public.promo_codes to authenticated;
alter table public.store_orders add column if not exists coupon_code text;
alter table public.store_orders add column if not exists discount_paise integer not null default 0;
