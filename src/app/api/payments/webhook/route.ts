import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "Webhook signature verification failed." }, { status: 400 });
  }

  try {
    const event = JSON.parse(rawBody);
    if (event.event !== "payment.captured" && event.event !== "order.paid") {
      return NextResponse.json({ received: true });
    }

    const payment = event.payload?.payment?.entity;
    const order = event.payload?.order?.entity;
    const razorpayOrderId = payment?.order_id ?? order?.id;
    const paymentId = payment?.id;
    if (!razorpayOrderId || !paymentId || payment?.status !== "captured" || payment?.currency !== "INR") {
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();
    const { data: storeOrder } = await admin.from("store_orders")
      .select("id,subtotal_paise,payment_status")
      .eq("razorpay_order_id", razorpayOrderId).maybeSingle();
    if (!storeOrder) return NextResponse.json({ received: true });

    if (payment.amount !== storeOrder.subtotal_paise) {
      return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
    }
    if (storeOrder.payment_status !== "paid") {
      const { error } = await admin.from("store_orders").update({
        payment_status: "paid", status: "confirmed", razorpay_payment_id: paymentId
      }).eq("id", storeOrder.id);
      if (error) return NextResponse.json({ error: "Could not reconcile payment." }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
