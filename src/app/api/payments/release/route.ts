import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orderId = String(body.orderId ?? "");
    const razorpayOrderId = String(body.razorpayOrderId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !razorpayOrderId) {
      return NextResponse.json({ error: "Invalid order details." }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("release_store_loyalty_redemption", {
      p_order_id: orderId,
      p_razorpay_order_id: razorpayOrderId
    });
    if (error) return NextResponse.json({ error: "Unable to release reserved points." }, { status: 500 });
    return NextResponse.json({ success: data === true });
  } catch {
    return NextResponse.json({ error: "Unable to release reserved points." }, { status: 400 });
  }
}
