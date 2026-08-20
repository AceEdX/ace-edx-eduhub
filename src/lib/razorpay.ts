import { toast } from "sonner";
import { createPaymentOrder, verifyPayment } from "@/lib/payments.functions";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export async function payAndUnlock(opts: {
  itemType: "course" | "webinar" | "subscription";
  itemId: string;
  couponCode?: string;
  name?: string;
  email?: string;
  onSuccess: () => Promise<void> | void;
}) {
  try {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      toast.error("Could not load the secure checkout. Check your connection and try again.");
      return;
    }

    const order = await createPaymentOrder({
      data: {
        itemType: opts.itemType,
        itemId: opts.itemId,
        ...(opts.couponCode ? { couponCode: opts.couponCode } : {}),
      },
    });

    const rzp = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "AceEdX",
      description: order.title,
      order_id: order.orderId,
      prefill: { name: opts.name ?? "", email: opts.email ?? "" },
      theme: { color: "#F97316" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const result = await verifyPayment({
            data: {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            },
          });
          toast.success(`Payment confirmed — ${result.title}`, {
            description:
              "Your access link is in your notifications. Tap to get the confirmation on WhatsApp.",
            duration: 12000,
            action: {
              label: "WhatsApp confirmation",
              onClick: () => window.open(result.whatsappUrl, "_blank", "noopener"),
            },
          });
          await opts.onSuccess();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Payment verification failed");
        }
      },
      modal: {
        ondismiss: () => toast.info("Payment cancelled"),
      },
    });

    rzp.open();
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Could not start checkout");
  }
}
