-- KURINJI CREATIONS: catalogue foundation
-- Run this migration only in a dedicated Supabase project for this store.

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price_paise integer not null check (price_paise >= 0),
  compare_at_price_paise integer check (compare_at_price_paise is null or compare_at_price_paise >= price_paise),
  sku text unique,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  material text,
  care_instructions text,
  is_featured boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists products_active_category_idx
  on public.products (is_active, category_id, created_at desc);
create index if not exists product_images_product_sort_idx
  on public.product_images (product_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_categories_set_updated_at on public.product_categories;
create trigger product_categories_set_updated_at
before update on public.product_categories
for each row execute function public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "Anyone can view active categories" on public.product_categories;
create policy "Anyone can view active categories"
on public.product_categories for select to anon, authenticated
using (is_active = true);

drop policy if exists "Store admins manage categories" on public.product_categories;
create policy "Store admins manage categories"
on public.product_categories for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin');

drop policy if exists "Anyone can view active products" on public.products;
create policy "Anyone can view active products"
on public.products for select to anon, authenticated
using (is_active = true);

drop policy if exists "Store admins manage products" on public.products;
create policy "Store admins manage products"
on public.products for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin');

drop policy if exists "Anyone can view images for active products" on public.product_images;
create policy "Anyone can view images for active products"
on public.product_images for select to anon, authenticated
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.is_active = true
  )
);

drop policy if exists "Store admins manage product images" on public.product_images;
create policy "Store admins manage product images"
on public.product_images for all to authenticated
using ((select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin')
with check ((select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin');

-- Public product photos; uploads and changes are restricted to store admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view product photos" on storage.objects;
create policy "Public can view product photos"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Store admins upload product photos" on storage.objects;
create policy "Store admins upload product photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and (select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin'
);

drop policy if exists "Store admins update product photos" on storage.objects;
create policy "Store admins update product photos"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and (select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin'
)
with check (
  bucket_id = 'product-images'
  and (select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin'
);

drop policy if exists "Store admins delete product photos" on storage.objects;
create policy "Store admins delete product photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select auth.jwt() -> 'app_metadata' ->> 'store_role') = 'admin'
);

-- No demo products are inserted: only the owner's real catalogue should be published.


-- Performance and policy refinement applied after initial schema creation.
create index if not exists products_category_id_idx on public.products(category_id);
drop policy if exists "Anyone can view active categories" on public.product_categories;
drop policy if exists "Store admins manage categories" on public.product_categories;
create policy "View active categories or admin" on public.product_categories for select to anon, authenticated
using (is_active = true or ((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins insert categories" on public.product_categories for insert to authenticated
with check (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins update categories" on public.product_categories for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins delete categories" on public.product_categories for delete to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
drop policy if exists "Anyone can view active products" on public.products;
drop policy if exists "Store admins manage products" on public.products;
create policy "View active products or admin" on public.products for select to anon, authenticated
using (is_active = true or ((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins insert products" on public.products for insert to authenticated
with check (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins update products" on public.products for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins delete products" on public.products for delete to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
drop policy if exists "Anyone can view images for active products" on public.product_images;
drop policy if exists "Store admins manage product images" on public.product_images;
create policy "View active product images or admin" on public.product_images for select to anon, authenticated
using (exists (select 1 from public.products p where p.id = product_id and p.is_active = true)
  or ((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins insert product images" on public.product_images for insert to authenticated
with check (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins update product images" on public.product_images for update to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin')
with check (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
create policy "Admins delete product images" on public.product_images for delete to authenticated
using (((select auth.jwt()) -> 'app_metadata' ->> 'store_role') = 'admin');
drop policy if exists "Store admins upload product photos" on storage.objects;
create policy "Store admins upload product photos" on storage.objects for insert to authenticated
with check (bucket_id='product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'store_role')='admin');
drop policy if exists "Store admins update product photos" on storage.objects;
create policy "Store admins update product photos" on storage.objects for update to authenticated
using (bucket_id='product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'store_role')='admin')
with check (bucket_id='product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'store_role')='admin');
drop policy if exists "Store admins delete product photos" on storage.objects;
create policy "Store admins delete product photos" on storage.objects for delete to authenticated
using (bucket_id='product-images' and ((select auth.jwt()) -> 'app_metadata' ->> 'store_role')='admin');
