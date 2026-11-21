import type { SupabaseClient } from "@supabase/supabase-js";

type NotificationEvent = "order_received" | "payment_confirmed" | "order_confirmed" | "order_processing" | "order_shipped" | "order_delivered" | "order_cancelled";

const copy: Record<NotificationEvent, { subject: (n: number) => string; heading: string; message: string }> = {
  order_received: { subject: n => `We received your Kurinji Creations order #${n}`, heading: "Order received", message: "Your order has been received. Complete the payment to confirm it. We’ll keep you updated as it moves forward." },
  payment_confirmed: { subject: n => `Payment confirmed for order #${n}`, heading: "Payment confirmed", message: "Your payment was received successfully and your order is confirmed. Thank you for shopping with Kurinji Creations." },
  order_confirmed: { subject: n => `Your order #${n} is confirmed`, heading: "Order confirmed", message: "Your order has been confirmed. We’ll let you know when preparation begins." },
  order_processing: { subject: n => `Your order #${n} is being prepared`, heading: "We’re preparing your order", message: "Your Kurinji Creations order is now being prepared with care." },
  order_shipped: { subject: n => `Your order #${n} has been shipped`, heading: "Your order is on its way", message: "Your order has been marked as shipped. Please contact us if you need delivery assistance." },
  order_delivered: { subject: n => `Your order #${n} has been delivered`, heading: "Order delivered", message: "Your order has been marked as delivered. We hope you love your jewellery. Thank you for choosing Kurinji Creations." },
  order_cancelled: { subject: n => `Update about your order #${n}`, heading: "Order cancelled", message: "Your order status has been changed to cancelled. Please contact us if you need help." }
};

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

export async function sendOrderNotification(admin: SupabaseClient, orderId: string, eventType: NotificationEvent) {
  const { data: order, error: orderError } = await admin.from("store_orders")
    .select("id,order_number,customer_name,email,phone,items,subtotal_paise,discount_paise,loyalty_discount_paise,status,payment_status")
    .eq("id", orderId).maybeSingle();
  if (orderError || !order) throw new Error("Could not load order for customer notification.");

  const recipient = typeof order.email === "string" ? order.email.trim() : "";
  const { data: event, error: insertError } = await admin.from("store_notification_events")
    .insert({ order_id: order.id, event_type: eventType, recipient_email: recipient || null, delivery_status: "pending" })
    .select("id").single();

  // A unique order/event key makes webhook retries and browser verification idempotent.
  if (insertError?.code === "23505") return { sent: false, duplicate: true };
  if (insertError || !event) throw new Error("Could not record customer notification.");

  if (!recipient) {
    await admin.from("store_notification_events").update({ delivery_status: "skipped", error_message: "Customer email address was not provided." }).eq("id", event.id);
    return { sent: false, skipped: true };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    await admin.from("store_notification_events").update({ delivery_status: "skipped", error_message: "Email provider is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL." }).eq("id", event.id);
    return { sent: false, skipped: true };
  }

  const content = copy[eventType];
  const items = Array.isArray(order.items) ? order.items : [];
  const itemRows = items.map((item: any) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e8e8e8">${escapeHtml(item.name)} × ${escapeHtml(item.quantity)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #e8e8e8">${(Number(item.unit_price_paise || 0) * Number(item.quantity || 0) / 100).toLocaleString("en-IN", { style: "currency", currency: "INR" })}</td></tr>`).join("");
  const total = (Number(order.subtotal_paise || 0) - Number(order.discount_paise || 0) - Number(order.loyalty_discount_paise || 0)) / 100;
  const html = `<div style="margin:0;background:#f6f7f9;padding:32px 12px;font-family:Arial,sans-serif;color:#202633"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e6e8ed;border-radius:16px;padding:28px"><p style="letter-spacing:3px;font-size:11px;color:#b47b35;font-weight:bold">KURINJI CREATIONS</p><h1 style="font-size:24px">${content.heading}</h1><p>Hello ${escapeHtml(order.customer_name)},</p><p>${content.message}</p><p style="padding:12px;background:#f7f7f8;border-radius:8px"><b>Order #${escapeHtml(order.order_number)}</b><br/>Status: ${escapeHtml(order.status)} · Payment: ${escapeHtml(order.payment_status)}</p><h3>Order summary</h3><table style="width:100%;border-collapse:collapse">${itemRows}<tr><td style="padding-top:14px"><b>Total</b></td><td align="right" style="padding-top:14px"><b>${total.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</b></td></tr></table><p style="margin-top:28px;color:#687080;font-size:13px">With care,<br/>Kurinji Creations</p></div></div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [recipient], subject: content.subject(order.order_number), html }),
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(String(result.message || result.name || "Email provider rejected the request."));
    await admin.from("store_notification_events").update({ delivery_status: "sent", provider_message_id: result.id ?? null, sent_at: new Date().toISOString(), error_message: null }).eq("id", event.id);
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email delivery failed.";
    await admin.from("store_notification_events").update({ delivery_status: "failed", error_message: message.slice(0, 500) }).eq("id", event.id);
    return { sent: false, failed: true };
  }
}
