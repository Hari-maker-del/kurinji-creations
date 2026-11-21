import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { retryOrderNotification } from "@/lib/notifications/order-email";

export const runtime = "nodejs";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await createClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const admin = createAdminClient();
    const { data: adminRow } = await admin.from("store_admins").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!adminRow) return NextResponse.json({ error: "Store administrator access required." }, { status: 403 });
    const { id } = await context.params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid notification." }, { status: 400 });
    const result = await retryOrderNotification(admin, id);
    return NextResponse.json({ success: Boolean(result.sent), result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to retry notification.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
