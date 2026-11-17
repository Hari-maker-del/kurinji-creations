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
    const items = body.items as CheckoutItem[];

    if (customerName.length < 2 || customerName.length > 100 || phone.length < 8 || phone.length > 20 ||
        !Array.isArray(items) || items.length < 1 || items.length > 10 ||
        items.some((item) => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10)) {
      return NextResponse.json({ error: "Please check your contact details and items." }, { status: 400 });
    }

    const admin = createAdminClient();
    const productIds = [...new Set(items.map((item) => item.productId))];
    const { data: products, error: productError } = await admin
      .from("products")
      .select("id,name,price_paise,stock_quantity,is_active")
      .in("id", productIds);
    if (productError || !products || products.length !== productIds.length) {
      return NextResponse.json({ error: "One or more products are unavailable." }, { status: 400 });
    }

    const orderItems = items.map((item) => {
      const product = products.find((row) => row.id === item.productId)!;
      if (!product.is_active || product.stock_quantity < item.quantity) throw new Error(product.name + " is currently unavailable in that quantity.");
      return { product_id: product.id, name: product.name, quantity: item.quantity, unit_price_paise: product.price_paise };
    });
    const amount = orderItems.reduce((sum, item) => sum + item.unit_price_paise * item.quantity, 0);
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
      customer_note: note || null, items: orderItems, subtotal_paise: amount,
      status: "new", payment_status: "pending", razorpay_order_id: razorpayOrder.id
    }).select("id,order_number").single();

    if (saveError || !savedOrder) {
      return NextResponse.json({ error: "Payment was created but the order could not be saved. Please contact the store before retrying." }, { status: 500 });
    }

    return NextResponse.json({
      orderId: savedOrder.id, orderNumber: savedOrder.order_number,
      razorpayOrderId: razorpayOrder.id, amount, currency: "INR", keyId
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
