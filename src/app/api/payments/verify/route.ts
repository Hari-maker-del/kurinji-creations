import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Payment verification is not configured." }, { status: 503 });
    }
    const body = await request.json();
    const orderId = String(body.orderId ?? "");
    const razorpayOrderId = String(body.razorpayOrderId ?? "");
    const paymentId = String(body.razorpayPaymentId ?? "");
    const signature = String(body.razorpaySignature ?? "");
    if (!orderId || !razorpayOrderId || !paymentId || !/^[a-f0-9]{64}$/i.test(signature)) {
      return NextResponse.json({ error: "Invalid payment verification details." }, { status: 400 });
    }

    // Verify the signature before treating this request as already processed.
    const expected = createHmac("sha256", keySecret).update(razorpayOrderId + "|" + paymentId).digest();
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length || !timingSafeEqual(expected, received)) {
      return NextResponse.json({ error: "Payment signature did not match." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error } = await admin.from("store_orders")
      .select("id,order_number,subtotal_paise,discount_paise,razorpay_order_id,payment_status")
      .eq("id", orderId).maybeSingle();
    if (error || !order || order.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json({ error: "Order could not be verified." }, { status: 404 });
    }

    const paymentResponse = await fetch("https://api.razorpay.com/v1/payments/" + encodeURIComponent(paymentId), {
      headers: { Authorization: "Basic " + Buffer.from(keyId + ":" + keySecret).toString("base64") },
      cache: "no-store"
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || payment.order_id !== razorpayOrderId || payment.amount !== (order.subtotal_paise - Number((order as any).discount_paise ?? 0)) ||
        payment.currency !== "INR" || payment.status !== "captured") {
      return NextResponse.json({ error: "Payment is not captured yet. Please wait and refresh your order status." }, { status: 409 });
    }

    // Atomic RPC validates stock, deducts it once, and marks the order paid/confirmed.
    const { data: processed, error: stockError } = await admin.rpc("confirm_paid_order_and_decrement_stock", {
      p_order_id: order.id, p_payment_id: paymentId, p_signature: signature
    });
    if (stockError || processed !== true) {
      return NextResponse.json({ error: "Payment received; order confirmation is being reconciled." }, { status: 500 });
    }
    return NextResponse.json({ success: true, orderNumber: order.order_number, alreadyPaid: order.payment_status === "paid" });
  } catch {
    return NextResponse.json({ error: "Unable to verify this payment. Please contact the store." }, { status: 500 });
  }
}
