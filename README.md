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

The catalogue backend is prepared, but it is intentionally not connected to an existing Supabase project yet. The currently available project in the account contains unrelated application tables, so do not use it for this store.

1. Create a dedicated Supabase project for **KURINJI CREATIONS**.
2. Open the project's SQL Editor and run `supabase/setup/catalogue.sql`.
3. Copy `.env.example` to `.env.local` and fill in the project's API URL and **publishable** key.
4. Add the same two variables in Vercel → Project → Settings → Environment Variables, then redeploy.
5. In Supabase Auth, create the store owner account. Assign `store_role: admin` in that user's **app_metadata** (never user_metadata), then sign out and back in to refresh the JWT.
6. Upload product photos to the `product-images` Storage bucket. Only authenticated store admins can upload, update, or delete files.

The schema creates categories, products, and product images with Row Level Security. Public visitors can read active catalogue items; only a user whose trusted app metadata contains `store_role=admin` can manage catalogue records.

**Important:** The four products currently shown on the website are design placeholders, not verified inventory. Replace their names, prices, photos, materials, and stock quantities with the shop owner's actual catalogue before accepting orders. Do not put a Supabase secret/service-role key in any `NEXT_PUBLIC_*` variable or browser code.

Current checkout remains a WhatsApp enquiry handoff; this setup does not activate online payments or order processing.
