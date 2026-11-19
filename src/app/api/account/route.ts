import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  try {
    const auth = await createClient();
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user?.phone) return NextResponse.json({ error: "Verify your phone number to view your account." }, { status: 401 });

    const phone = user.phone.replace(/[^0-9]/g, "");
    if (phone.length < 8) return NextResponse.json({ error: "Your verified phone number is invalid." }, { status: 400 });

    const admin = createAdminClient();
    const { data: orders, error: orderError } = await admin.from("store_orders")
      .select("id,order_number,customer_name,phone,items,subtotal_paise,discount_paise,loyalty_discount_paise,loyalty_points_redeemed,coupon_code,status,payment_status,created_at,updated_at")
      .order("created_at", { ascending: false }).limit(100);
    if (orderError) return NextResponse.json({ error: "Unable to load your orders." }, { status: 500 });

    const mine = (orders ?? []).filter(order => (order.phone ?? "").replace(/[^0-9]/g, "") === phone);
    const { data: account, error: loyaltyError } = await admin.from("store_loyalty_accounts")
      .select("id,phone,customer_name,email,points_balance,lifetime_points,tier,referral_code,created_at")
      .eq("phone", phone).maybeSingle();
    if (loyaltyError) return NextResponse.json({ error: "Unable to load your rewards." }, { status: 500 });

    let ledger: any[] = [];
    let referrals: any[] = [];
    if (account) {
      const [{ data: ledgerRows, error: ledgerError }, { data: referralRows, error: referralError }] = await Promise.all([
        admin.from("store_loyalty_ledger").select("id,points,event_type,description,created_at").eq("account_id", account.id).order("created_at", { ascending: false }).limit(50),
        admin.from("store_referrals").select("id,referral_code,referrer_points,referred_points,created_at").eq("referrer_account_id", account.id).order("created_at", { ascending: false }).limit(50)
      ]);
      if (ledgerError || referralError) return NextResponse.json({ error: "Unable to load your rewards history." }, { status: 500 });
      ledger = ledgerRows ?? [];
      referrals = referralRows ?? [];
    }
    return NextResponse.json({ profile: { name: account?.customer_name ?? mine[0]?.customer_name ?? "", phone: user.phone }, orders: mine, loyalty: account ? { ...account, ledger, referrals } : null });
  } catch {
    return NextResponse.json({ error: "Unable to load your account." }, { status: 500 });
  }
}
