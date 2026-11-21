# Kurinji Creations

A mobile-first jewellery storefront built with Next.js, React, TypeScript and Tailwind CSS.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Included in this starter
- Responsive editorial-style storefront
- Mobile bottom navigation and desktop navigation
- Category browsing and client-side product search
- Sample product cards and wishlist interactions
- Shopping bag drawer with subtotal and remove actions
- WhatsApp order handoff
- Brand story, store promises and contact section

## Before accepting real orders
The products, prices, imagery and availability currently shown are sample content. Replace them with the actual business catalogue and verified product information. Configure the official WhatsApp Business number. Add accurate shipping, returns, privacy and terms policies. Connect a backend for inventory and order records, and implement payment verification server-side before enabling online checkout.

## Vercel
Import this repository into Vercel. Framework preset: Next.js. Build command: `npm run build`.


## Supabase setup (dedicated store project)

A dedicated Supabase project is now provisioned for this store in Singapore.

- Project ref: `jubopzqecnbmjtfzngph`
- API URL: `https://jubopzqecnbmjtfzngph.supabase.co`
- Tables: `product_categories`, `products`, `product_images`
- Storage bucket: `product-images`
- Vercel production, preview and development environments have the public URL and publishable key configured.

The schema is already applied. To reproduce it in another dedicated project, run `supabase/setup/catalogue.sql` in the Supabase SQL Editor.

The storefront reads active products from Supabase and product detail pages look up products by slug. If no active products are available, the shop displays a collection-coming-soon message rather than fabricated sample products or stock.

Store-owner access is managed through the `public.store_admins` table. Add the owner's Supabase Auth user UUID to `store_admins` after the account is created. The application admin dashboard and its server-side admin APIs check this table. Do not use editable `user_metadata` for authorization. The current app does not use `app_metadata.store_role` as its admin source of truth.

The schema creates categories, products, and product images with Row Level Security. Public visitors can read active catalogue items; catalogue write policies must authorize the store-owner accounts registered in `public.store_admins`.

**Important:** The four products currently shown on the website are design placeholders, not verified inventory. Replace their names, prices, photos, materials, and stock quantities with the shop owner's actual catalogue before accepting orders. Do not put a Supabase secret/service-role key in any `NEXT_PUBLIC_*` variable or browser code.

Current checkout remains a WhatsApp enquiry handoff; this setup does not activate online payments or order processing.
