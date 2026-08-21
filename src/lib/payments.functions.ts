import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ITEM_TYPES = ["course", "webinar", "subscription"] as const;

const createSchema = z.object({
  itemType: z.enum(ITEM_TYPES),
  itemId: z.string().uuid(),
  couponCode: z.string().max(40).optional(),
});

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

const couponSchema = z.object({
  code: z.string().min(1).max(40),
  itemType: z.enum(ITEM_TYPES),
  amountInr: z.number().int().min(0),
});

type CouponRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  applies_to: string;
  max_redemptions: number | null;
  redemptions: number;
  expires_at: string | null;
  active: boolean;
};

function computeDiscount(coupon: CouponRow, amountInr: number) {
  const raw =
    coupon.discount_type === "flat"
      ? coupon.discount_value
      : Math.round((amountInr * coupon.discount_value) / 100);
  return Math.max(0, Math.min(raw, amountInr));
}

function couponProblem(coupon: CouponRow | null, itemType: string) {
  if (!coupon || !coupon.active) return "That coupon code is not valid.";
  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now())
    return "That coupon has expired.";
  if (coupon.max_redemptions !== null && coupon.redemptions >= coupon.max_redemptions)
    return "That coupon has been fully redeemed.";
  if (coupon.applies_to !== "all" && coupon.applies_to !== itemType)
    return "That coupon does not apply to this purchase.";
  return null;
}

function readKeys() {
  const keyId = process.env["RAZORPAY_KEY_ID"];
  const keySecret = process.env["RAZORPAY_KEY_SECRET"];
  if (!keyId || !keySecret) {
    throw new Error(
      "Online payments are not configured yet. Add the Razorpay key id and secret to enable checkout.",
    );
  }
  return { keyId, keySecret };
}

export const getPaymentConfig = createServerFn({ method: "GET" }).handler(async () => ({
  enabled: Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]),
}));

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => couponSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: coupon } = await context.supabase
      .from("coupons")
      .select("*")
      .eq("code", data.code.trim().toUpperCase())
      .maybeSingle();

    const problem = couponProblem((coupon as CouponRow | null) ?? null, data.itemType);
    if (problem || !coupon) return { valid: false as const, message: problem ?? "Invalid coupon." };

    const discount = computeDiscount(coupon as CouponRow, data.amountInr);
    return {
      valid: true as const,
      code: (coupon as CouponRow).code,
      discountInr: discount,
      payableInr: data.amountInr - discount,
    };
  });

export const createPaymentOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { keyId, keySecret } = readKeys();
    const { supabase, userId } = context;

    let title = "";
    let basePrice = 0;

    if (data.itemType === "subscription") {
      const { data: plan, error } = await supabase
        .from("subscription_plans")
        .select("id, name, price_inr, active")
        .eq("id", data.itemId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!plan || !plan.active) throw new Error("That plan could not be found.");
      if (plan.price_inr <= 0) throw new Error("This plan is free — no payment needed.");
      title = plan.name;
      basePrice = plan.price_inr;
    } else {
      const table = data.itemType === "course" ? "courses" : "webinars";
      const { data: item, error } = await supabase
        .from(table)
        .select("id, title, price_inr, is_free")
        .eq("id", data.itemId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!item) throw new Error("That item could not be found.");
      if (item.is_free || item.price_inr <= 0)
        throw new Error("This item is free — no payment needed.");
      title = item.title;
      basePrice = item.price_inr;
    }

    let discount = 0;
    let couponCode: string | null = null;
    if (data.couponCode?.trim()) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", data.couponCode.trim().toUpperCase())
        .maybeSingle();
      const problem = couponProblem((coupon as CouponRow | null) ?? null, data.itemType);
      if (problem) throw new Error(problem);
      discount = computeDiscount(coupon as CouponRow, basePrice);
      couponCode = (coupon as CouponRow).code;
    }

    const payable = Math.max(basePrice - discount, 0);
    if (payable <= 0) throw new Error("This coupon covers the full amount — contact support to enrol.");

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: payable * 100,
        currency: "INR",
        notes: { item_type: data.itemType, item_id: data.itemId, user_id: userId },
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
      item_id: data.itemId,
      item_title: title,
      amount_inr: payable,
      discount_inr: discount,
      coupon_code: couponCode,
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
      title,
      discountInr: discount,
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

    const needsAdmin = order.item_type === "subscription" || Boolean(order.coupon_code);
    if (needsAdmin) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      if (order.item_type === "subscription" && order.item_id) {
        const { data: plan } = await supabaseAdmin
          .from("subscription_plans")
          .select("id, interval_months")
          .eq("id", order.item_id)
          .maybeSingle();
        const months = plan?.interval_months ?? 12;
        const end = new Date();
        end.setMonth(end.getMonth() + months);
        await supabaseAdmin.from("subscriptions").insert({
          user_id: userId,
          plan_id: order.item_id,
          order_id: order.id,
          status: "active",
          current_period_end: end.toISOString(),
        });
      }

      if (order.coupon_code) {
        const { data: coupon } = await supabaseAdmin
          .from("coupons")
          .select("id, redemptions")
          .eq("code", order.coupon_code)
          .maybeSingle();
        if (coupon) {
          await supabaseAdmin.from("coupon_redemptions").insert({
            coupon_id: coupon.id,
            user_id: userId,
            order_id: order.id,
            discount_inr: order.discount_inr ?? 0,
          });
          await supabaseAdmin
            .from("coupons")
            .update({ redemptions: (coupon.redemptions ?? 0) + 1 })
            .eq("id", coupon.id);
        }
      }
    }

    // Confirmation: in-app notification + a WhatsApp-ready confirmation message
    let link = "/my-learning";
    if (order.item_type === "course" && order.item_id) {
      const { data: course } = await supabase
        .from("courses")
        .select("slug")
        .eq("id", order.item_id)
        .maybeSingle();
      if (course?.slug) link = `/learn/${course.slug}`;
    } else if (order.item_type === "webinar" && order.item_id) {
      const { data: webinar } = await supabase
        .from("webinars")
        .select("slug")
        .eq("id", order.item_id)
        .maybeSingle();
      if (webinar?.slug) link = `/webinars/${webinar.slug}`;
    } else if (order.item_type === "subscription") {
      const { data: application } = await supabase
        .from("resource_principal_applications")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      link = application ? "/studio" : "/dashboard";
    }

    const message = `Payment confirmed on AceEdX PrincipalX.\n\nItem: ${order.item_title}\nAmount paid: Rs ${order.amount_inr}\nPayment id: ${data.razorpayPaymentId}\nAccess link: https://eduhub.aceedx.com${link}\n\nThank you.`;

    await supabase.from("notifications").insert({
      user_id: userId,
      title: `Payment confirmed — ${order.item_title}`,
      body: `We have received Rs ${order.amount_inr}. Your access link is ready. Payment id ${data.razorpayPaymentId}.`,
      link,
    });

    return {
      ok: true,
      itemType: order.item_type,
      itemId: order.item_id,
      title: order.item_title,
      amountInr: order.amount_inr,
      paymentId: data.razorpayPaymentId,
      link,
      whatsappUrl: `https://wa.me/919373387800?text=${encodeURIComponent(message)}`,
    };
  });
