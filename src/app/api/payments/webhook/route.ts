import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotification } from "@/lib/notifications/order-email";

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
    if (event.event === "payment.failed") {
      const failedPayment = event.payload?.payment?.entity;
      if (failedPayment?.order_id) {
        const admin = createAdminClient();
        const { data: failedOrder } = await admin.from("store_orders").select("id,razorpay_order_id").eq("razorpay_order_id", failedPayment.order_id).maybeSingle();
        if (failedOrder) await admin.rpc("release_store_loyalty_redemption", { p_order_id: failedOrder.id, p_razorpay_order_id: failedOrder.razorpay_order_id });
      }
      return NextResponse.json({ received: true });
    }
    if (event.event !== "payment.captured" && event.event !== "order.paid") {
      return NextResponse.json({ received: true });
    }
    const payment = event.payload?.payment?.entity;
    const orderEntity = event.payload?.order?.entity;
    const razorpayOrderId = payment?.order_id ?? orderEntity?.id;
    const paymentId = payment?.id;
    if (!razorpayOrderId || !paymentId || payment?.status !== "captured" || payment?.currency !== "INR") {
      return NextResponse.json({ received: true });
    }

    const admin = createAdminClient();
    const { data: storeOrder, error: orderError } = await admin.from("store_orders")
      .select("id,subtotal_paise,discount_paise,loyalty_discount_paise,payment_status")
      .eq("razorpay_order_id", razorpayOrderId).maybeSingle();
    if (orderError) return NextResponse.json({ error: "Could not retrieve order." }, { status: 500 });
    if (!storeOrder) return NextResponse.json({ received: true });
    if (payment.amount !== (storeOrder.subtotal_paise - Number(storeOrder.discount_paise ?? 0) - Number((storeOrder as any).loyalty_discount_paise ?? 0))) {
      return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
    }

    // Same atomic stock RPC as browser verification. Its adjustment ledger makes retries idempotent.
    const { data: processed, error: stockError } = await admin.rpc("confirm_paid_order_and_decrement_stock", {
      p_order_id: storeOrder.id, p_payment_id: paymentId, p_signature: null
    });
    if (stockError || processed !== true) {
      await admin.rpc("release_promo_usage_for_order", { p_order_id: storeOrder.id });
      return NextResponse.json({ error: "Could not reconcile payment and inventory." }, { status: 500 });
    }
    try { await sendOrderNotification(admin, storeOrder.id, "payment_confirmed"); } catch { /* Webhook retries must not be caused by email outages. */ }
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
}
