# Razorpay setup — Kurinji Creations

The secure server endpoints are prepared for Razorpay Standard Checkout. The server calculates order totals from active catalogue prices, creates Razorpay orders, verifies the HMAC signature, fetches payment status and only marks an order paid when Razorpay reports it as captured.

## Vercel environment variables

Add these to the Kurinji Creations project for the required environments:

- `RAZORPAY_KEY_ID` — Razorpay Dashboard → Account & Settings → API Keys (start with Test Mode).
- `RAZORPAY_KEY_SECRET` — matching secret. Server-only.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase Project Settings → API Keys → service_role/secret key. Server-only.

Do not prefix these with `NEXT_PUBLIC_`, commit their values, or share them in chat.

## Test and launch checklist

1. Generate Razorpay **Test Mode** API keys.
2. Add the three variables above in Vercel and redeploy.
3. Test successful, failed, cancelled and repeated payments.
4. Confirm only captured payments are marked Paid in the owner dashboard.
5. Add webhook reconciliation for `payment.captured`, `payment.failed` and `order.paid` before launch.
6. Switch to Live Mode keys only after merchant KYC, settlement details, policies, shipping/returns and test cases are complete.

## Current status

Server-side order creation and payment verification endpoints are prepared. The customer-facing Checkout button and webhook reconciliation are not yet connected. Until those are complete, use the existing order enquiry / WhatsApp flow. This code does not enable live payments by itself.
