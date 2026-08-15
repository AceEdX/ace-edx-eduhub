import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { payAndUnlock } from "@/lib/razorpay";
import { validateCoupon } from "@/lib/payments.functions";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Membership plans for school leaders — AceEdX" },
      {
        name: "description",
        content:
          "Choose a PrincipalX membership: community access, all masterclasses and courses, premium toolkits and verified certificates.",
      },
      { property: "og:title", content: "Membership plans for school leaders — AceEdX" },
      {
        property: "og:description",
        content: "Community, Pro and Institution memberships for principals and school owners.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { user } = useAuth();
  const [coupon, setCoupon] = useState("");
  const [discountNote, setDiscountNote] = useState("");

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function checkCoupon(amount: number) {
    if (!coupon.trim()) return;
    try {
      const res = await validateCoupon({
        data: { code: coupon.trim(), itemType: "subscription", amountInr: amount },
      });
      if (!res.valid) {
        setDiscountNote(res.message);
        return;
      }
      setDiscountNote(`₹${res.discountInr.toLocaleString("en-IN")} off — you pay ₹${res.payableInr.toLocaleString("en-IN")}`);
    } catch (error) {
      setDiscountNote(error instanceof Error ? error.message : "Could not check that code");
    }
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Membership"
        title="Plans built for school leaders"
        description="Join free, or go Pro for every masterclass, course, toolkit and certificate across the year."
      />
      <div className="container-page py-12">
        <div className="mx-auto mb-8 flex max-w-md gap-2">
          <Input
            value={coupon}
            placeholder="Have a coupon code?"
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          />
          <Button
            variant="outline"
            onClick={() => checkCoupon(plans.data?.[1]?.price_inr ?? 0)}
            disabled={!user}
          >
            Apply
          </Button>
        </div>
        {discountNote && (
          <p className="mb-8 text-center text-sm text-muted-foreground">{discountNote}</p>
        )}

        {plans.isLoading ? (
          <Skeleton className="h-80 rounded-2xl" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {(plans.data ?? []).map((plan) => (
              <div key={plan.id} className="card-surface flex flex-col p-6">
                <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
                <p className="mt-5 font-display text-3xl font-semibold">
                  {plan.price_inr === 0 ? "Free" : `₹${plan.price_inr.toLocaleString("en-IN")}`}
                  {plan.price_inr > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      / {plan.interval_months} months
                    </span>
                  )}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm">
                  {plan.features.map((f: string) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {plan.price_inr === 0 ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/auth" search={{ mode: "signup" }}>
                        Join free
                      </Link>
                    </Button>
                  ) : !user ? (
                    <Button variant="brand" className="w-full" asChild>
                      <Link to="/auth" search={{ mode: "signin" }}>
                        Sign in to subscribe
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="brand"
                      className="w-full"
                      onClick={() =>
                        payAndUnlock({
                          itemType: "subscription",
                          itemId: plan.id,
                          couponCode: coupon.trim() || undefined,
                          email: user.email ?? "",
                          onSuccess: () => toast.success("Membership active — welcome aboard!"),
                        })
                      }
                    >
                      Subscribe
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
