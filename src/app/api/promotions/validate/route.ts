import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = String(body.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
    const subtotalPaise = Number(body.subtotalPaise);
    if (!code || code.length > 40 || !Number.isSafeInteger(subtotalPaise) || subtotalPaise < 0) {
      return NextResponse.json({ error: "Enter a valid promotion code." }, { status: 400 });
    }
    const admin = createAdminClient();
    const { data: promo, error } = await admin.from("promo_codes").select("*").eq("code", code).maybeSingle();
    if (error || !promo || !promo.is_active) return NextResponse.json({ error: "This promotion code is not available." }, { status: 404 });
    const now = Date.now();
    if (promo.starts_at && new Date(promo.starts_at).getTime() > now) return NextResponse.json({ error: "This promotion has not started yet." }, { status: 400 });
    if (promo.ends_at && new Date(promo.ends_at).getTime() < now) return NextResponse.json({ error: "This promotion has expired." }, { status: 400 });
    if (promo.usage_limit !== null && promo.usage_count >= promo.usage_limit) return NextResponse.json({ error: "This promotion has reached its usage limit." }, { status: 400 });
    if (subtotalPaise < Number(promo.min_order_paise || 0)) return NextResponse.json({ error: "Minimum order value is " + (Number(promo.min_order_paise)/100).toLocaleString("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}) + "." }, { status: 400 });
    let discountPaise = promo.discount_type === "percent" ? Math.floor(subtotalPaise * Number(promo.discount_value) / 100) : Number(promo.discount_value);
    if (promo.max_discount_paise !== null) discountPaise = Math.min(discountPaise, Number(promo.max_discount_paise));
    discountPaise = Math.max(0, Math.min(subtotalPaise, discountPaise));
    return NextResponse.json({ code: promo.code, discountPaise, totalPaise: subtotalPaise - discountPaise, discountType: promo.discount_type, discountValue: promo.discount_value });
  } catch {
    return NextResponse.json({ error: "Unable to validate this promotion." }, { status: 500 });
  }
}
