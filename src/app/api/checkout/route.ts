import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type CheckoutItem = { productId: string; quantity: number };

export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Online payment is not configured yet. Please use the order enquiry option." }, { status: 503 });
    }

    const body = await request.json();
    const customerName = String(body.customerName ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const email = String(body.email ?? "").trim();
    const address = String(body.address ?? "").trim();
    const note = String(body.note ?? "").trim();
    const couponCode = String(body.couponCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const referralCode = String(body.referralCode ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const items = body.items as CheckoutItem[];

    if (customerName.length < 2 || customerName.length > 100 || phone.length < 8 || phone.length > 20 ||
        !Array.isArray(items) || items.length < 1 || items.length > 10 ||
        items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
      return NextResponse.json({ error: "Please check your contact details and items." }, { status: 400 });
    }

    const admin = createAdminClient();
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    const productIds = [...quantities.keys()];
    const { data: products, error: productError } = await admin
      .from("products")
      .select("id,name,price_paise,stock_quantity,is_active")
      .in("id", productIds);
    if (productError || !products || products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }

    const orderItems = productIds.map((productId) => {
      const product = products.find((row) => row.id === productId)!;
      const quantity = quantities.get(productId)!;
      if (!product.is_active || product.stock_quantity < quantity) {
        throw new Error(product.name + " has only " + Math.max(0, product.stock_quantity) + " available.");
      }
      return { product_id: product.id, name: product.name, quantity, unit_price_paise: product.price_paise };
    });
    const subtotal = orderItems.reduce((sum, item) => sum + item.unit_price_paise * item.quantity, 0);
    let discountPaise = 0;
    let appliedCoupon: string | null = null;
    if (couponCode) {
      const { data: promo, error: promoError } = await admin.from("promo_codes").select("*").eq("code", couponCode).maybeSingle();
      const now = Date.now();
      if (promoError || !promo || !promo.is_active) return NextResponse.json({ error: "This promotion code is not available." }, { status: 400 });
      if ((promo.starts_at && new Date(promo.starts_at).getTime() > now) || (promo.ends_at && new Date(promo.ends_at).getTime() < now)) return NextResponse.json({ error: "This promotion is not currently valid." }, { status: 400 });
      if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) return NextResponse.json({ error: "This promotion has reached its usage limit." }, { status: 400 });
      if (subtotal < Number(promo.min_order_paise || 0)) return NextResponse.json({ error: "Your order does not meet this promotion's minimum value." }, { status: 400 });
      discountPaise = promo.discount_type === "percent" ? Math.floor(subtotal * Number(promo.discount_value) / 100) : Number(promo.discount_value);
      if (promo.max_discount_paise !== null) discountPaise = Math.min(discountPaise, Number(promo.max_discount_paise));
      discountPaise = Math.max(0, Math.min(subtotal, discountPaise));
      appliedCoupon = promo.code;
    }
    let referrerAccountId: string | null = null;
    if (referralCode) {
      const normalizedPhone = phone.replace(/[^0-9]/g, "");
      const { data: referralRows, error: referralError } = await admin.rpc("validate_store_referral_code", { p_code: referralCode, p_phone: normalizedPhone });
      const referral = Array.isArray(referralRows) ? referralRows[0] : null;
      if (referralError || !referral) return NextResponse.json({ error: "This referral code is invalid, already used for this phone number, or belongs to you." }, { status: 400 });
      referrerAccountId = referral.referrer_account_id;
    }
    const amount = subtotal - discountPaise;
    if (!Number.isSafeInteger(amount) || amount < 100) return NextResponse.json({ error: "Order total must be at least ₹1." }, { status: 400 });

    const receipt = "kc_" + Date.now().toString();
    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64")
      },
      body: JSON.stringify({ amount, currency: "INR", receipt, notes: { store: "Kurinji Creations" } }),
      cache: "no-store"
    });
    const razorpayOrder = await razorpayResponse.json();
    if (!razorpayResponse.ok) {
      return NextResponse.json({ error: "Unable to start payment. Please try again." }, { status: 502 });
    }

    const { data: savedOrder, error: saveError } = await admin.from("store_orders").insert({
      customer_name: customerName, phone, email: email || null, address: address || null,
      customer_note: note || null, items: orderItems, subtotal_paise: subtotal,
      coupon_code: appliedCoupon, discount_paise: discountPaise,
      referral_code: referralCode || null, referrer_account_id: referrerAccountId,
      status: "new", payment_status: "pending", razorpay_order_id: razorpayOrder.id
    }).select("id,order_number").single();

    if (saveError || !savedOrder) {
      return NextResponse.json({ error: "Payment was created but the order could not be saved. Please contact the store before retrying." }, { status: 500 });
    }

    if (appliedCoupon) {
      const { data: usageReserved, error: usageError } = await admin.rpc("increment_promo_usage", { p_code: appliedCoupon });
      if (usageError || !usageReserved) {
        await admin.from("store_orders").delete().eq("id", savedOrder.id);
        return NextResponse.json({ error: "This promotion has just reached its usage limit. Please retry without the code." }, { status: 409 });
      }
    }

    return NextResponse.json({
      orderId: savedOrder.id, orderNumber: savedOrder.order_number,
      razorpayOrderId: razorpayOrder.id, amount, subtotal, discountPaise, couponCode: appliedCoupon, referralCode: referralCode || null, currency: "INR", keyId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
