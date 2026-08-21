import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const TRIAL_DAYS = 30;

export type Membership = {
  isPro: boolean;
  trialStart: string | null;
  trialEndsAt: string | null;
  trialDaysLeft: number;
  trialActive: boolean;
  trialExpired: boolean;
};

/**
 * Resource Principals get one free month from the day they apply. After that a
 * PrincipalX Pro subscription is required to keep hosting.
 */
export function useMembership(userId: string | undefined) {
  return useQuery<Membership>({
    queryKey: ["membership", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const [{ data: sub }, { data: application }] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("id, status, current_period_end")
          .eq("user_id", userId!)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .maybeSingle(),
        supabase
          .from("resource_principal_applications")
          .select("created_at")
          .eq("user_id", userId!)
          .maybeSingle(),
      ]);

      const trialStart = application?.created_at ?? null;
      const trialEnd = trialStart
        ? new Date(new Date(trialStart).getTime() + TRIAL_DAYS * 86400000)
        : null;
      const msLeft = trialEnd ? trialEnd.getTime() - Date.now() : 0;
      const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil(msLeft / 86400000)) : 0;

      return {
        isPro: Boolean(sub),
        trialStart,
        trialEndsAt: trialEnd ? trialEnd.toISOString() : null,
        trialDaysLeft,
        trialActive: Boolean(trialEnd) && msLeft > 0,
        trialExpired: Boolean(trialEnd) && msLeft <= 0,
      };
    },
  });
}

export function whatsappConfirmationUrl(message: string) {
  return `https://wa.me/919373387800?text=${encodeURIComponent(message)}`;
}
