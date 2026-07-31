import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  itemType: z.enum(["course", "webinar"]),
  itemId: z.string().uuid(),
});

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

function readKeys() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error(
      "Online payments are not configured yet. Add the Razorpay key id and secret to enable checkout.",
    );
  }
  return { keyId, keySecret };
}

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
}));

export const createPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { keyId, keySecret } = readKeys();
    const { supabase, userId } = context;

    const table = data.itemType === "course" ? "courses" : "webinars";
    const { data: item, error } = await supabase
      .from(table)
      .select("id, title, price_inr, is_free")
      .eq("id", data.itemId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) throw new Error("That item could not be found.");
    if (item.is_free || item.price_inr <= 0) throw new Error("This item is free — no payment needed.");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: item.price_inr * 100,
        currency: "INR",
        notes: { item_type: data.itemType, item_id: item.id, user_id: userId },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[razorpay] order create failed", res.status, body);
      throw new Error("Payment provider rejected the request. Please try again.");
    }

    const order = (await res.json()) as { id: string; amount: number };

    const { error: insertError } = await supabase.from("orders").insert({
      user_id: userId,
      item_type: data.itemType,
      item_id: item.id,
      item_title: item.title,
      amount_inr: item.price_inr,
      status: "pending",
      provider: "razorpay",
      provider_order_id: order.id,
    });
    if (insertError) throw new Error(insertError.message);

    return {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: "INR",
      title: item.title,
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => verifySchema.parse(data))
  .handler(async ({ data, context }) => {
    const { keySecret } = readKeys();
    const { supabase, userId } = context;

    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(data.razorpaySignature);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Payment could not be verified.");
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("provider_order_id", data.razorpayOrderId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found.");

    await supabase
      .from("orders")
      .update({ status: "paid", provider_payment_id: data.razorpayPaymentId })
      .eq("id", order.id);

    if (order.item_type === "course" && order.item_id) {
      await supabase
        .from("enrollments")
        .upsert({ user_id: userId, course_id: order.item_id }, { onConflict: "user_id,course_id" });
    }
    if (order.item_type === "webinar" && order.item_id) {
      await supabase
        .from("webinar_registrations")
        .upsert({ user_id: userId, webinar_id: order.item_id }, { onConflict: "user_id,webinar_id" });
    }

    return { ok: true, itemType: order.item_type, itemId: order.item_id };
  });
