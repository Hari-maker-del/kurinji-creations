# Kurinji Creations

A mobile-first jewellery storefront built with Next.js 15, React 19, TypeScript, Supabase and Vercel.

## Brand direction

Preserve the approved Kurinji Creations identity: the silver lotus and infinity logo, editorial serif typography, warm ivory and sand surfaces, deep brown accents and restrained muted-gold details. The customer experience should feel personal, calm and premium rather than like a generic marketplace.

## Application areas

- **Home:** brand story, custom jewellery introduction, craftsmanship and store calls to action.
- **Shop:** live active-product catalogue from Supabase, category/search/filter/sort controls, wishlist and shopping bag.
- **Product details:** product information, images, stock state and customisation inputs where enabled.
- **Checkout and orders:** checkout flow, payment initiation/verification and order confirmation routes.
- **Customer account:** sign-in, order history and loyalty information.
- **Admin:** product/catalogue and store operations for users registered in `public.store_admins`.

## Local development

Requirements: Node.js 22 or later.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment and services

The storefront uses Supabase for catalogue and account data. Configure the public Supabase URL and publishable key in the appropriate Vercel environments. Never expose a Supabase secret/service-role key through a `NEXT_PUBLIC_*` variable or browser code.

The dedicated Supabase project is:

- Project ref: `jubopzqecnbmjtfzngph`
- URL: `https://jubopzqecnbmjtfzngph.supabase.co`

Store-owner authorization is based on membership in `public.store_admins`; do not use editable user metadata as an authorization source.

## Catalogue operations

The shop reads active products and their category and image records from Supabase. If there are no active products, the shop displays a collection-coming-soon state instead of inventing catalogue items. Add verified product names, prices, photos, descriptions and stock before promoting products.

## Payments and notifications

Payment and notification integrations depend on the production environment variables and provider configuration being present. Verify the live Razorpay flow, payment signature checks, order status transitions, stock deduction and email delivery with test transactions before relying on them for customer orders.

## Quality checks

```bash
npm run lint
npm run build
```

Run both checks before merging or deploying changes. A successful Vercel build confirms compilation and deployment, not end-to-end payment, email, fulfilment or admin workflow correctness.
