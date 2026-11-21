import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export async function GET() {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const admin = createAdminClient();
    const { data: adminRow } = await admin.from("store_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return NextResponse.json({ error: "Store administrator access required." }, { status: 403 });

    const { data: events, error } = await admin.from("store_notification_events")
      .select("id,order_id,event_type,recipient_email,delivery_status,provider_message_id,error_message,created_at,sent_at")
      .order("created_at", { ascending: false }).limit(150);
    if (error) return NextResponse.json({ error: "Unable to load notification history." }, { status: 500 });
    const orderIds = [...new Set((events ?? []).map(event => event.order_id))];
    const { data: orders, error: ordersError } = orderIds.length
      ? await admin.from("store_orders").select("id,order_number,customer_name").in("id", orderIds)
      : { data: [], error: null };
    if (ordersError) return NextResponse.json({ error: "Unable to load notification order details." }, { status: 500 });
    const orderMap = new Map((orders ?? []).map(order => [order.id, order]));
    return NextResponse.json({ events: (events ?? []).map(event => ({ ...event, order: orderMap.get(event.order_id) ?? null })) });
  } catch {
    return NextResponse.json({ error: "Unable to load notification history." }, { status: 500 });
  }
}
