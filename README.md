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

The storefront reads active products from Supabase and product detail pages look up products by slug. Until real products are entered and activated, the original sample catalogue remains as a clearly labelled preview.

To grant store-owner access, create the owner's account in Supabase Auth and assign `store_role: admin` in trusted **app_metadata** (never user_metadata), then have the owner sign out and back in to refresh the JWT. Only store admins can write catalogue records or upload product images.

The schema creates categories, products, and product images with Row Level Security. Public visitors can read active catalogue items; only a user whose trusted app metadata contains `store_role=admin` can manage catalogue records.

**Important:** The four products currently shown on the website are design placeholders, not verified inventory. Replace their names, prices, photos, materials, and stock quantities with the shop owner's actual catalogue before accepting orders. Do not put a Supabase secret/service-role key in any `NEXT_PUBLIC_*` variable or browser code.

Current checkout remains a WhatsApp enquiry handoff; this setup does not activate online payments or order processing.
