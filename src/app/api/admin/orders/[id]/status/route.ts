import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderNotification } from "@/lib/notifications/order-email";

export const runtime = "nodejs";
const allowed = ["new", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
type OrderStatus = typeof allowed[number];
const eventForStatus: Partial<Record<OrderStatus, "order_confirmed" | "order_processing" | "order_shipped" | "order_delivered" | "order_cancelled">> = {
  confirmed: "order_confirmed", processing: "order_processing", shipped: "order_shipped",
  delivered: "order_delivered", cancelled: "order_cancelled"
};

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const admin = createAdminClient();
    const { data: adminRow } = await admin.from("store_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return NextResponse.json({ error: "Store administrator access required." }, { status: 403 });

    const { id } = await context.params;
    const body = await request.json();
    const status = String(body.status) as OrderStatus;
    if (!/^[0-9a-f-]{36}$/i.test(id) || !allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid order or status." }, { status: 400 });
    }
    const { data: order, error } = await admin.from("store_orders").update({ status })
      .eq("id", id).select("id,order_number,status").single();
    if (error || !order) return NextResponse.json({ error: "Unable to update order status." }, { status: 500 });

    const event = eventForStatus[status];
    let notification: { sent?: boolean; skipped?: boolean } | null = null;
    if (event) {
      try { notification = await sendOrderNotification(admin, id, event); }
      catch { notification = { skipped: true }; }
    }
    return NextResponse.json({ success: true, order, notification });
  } catch {
    return NextResponse.json({ error: "Unable to update this order." }, { status: 500 });
  }
}
