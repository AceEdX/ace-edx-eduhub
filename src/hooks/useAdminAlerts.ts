import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function countRows(table: string, column: string, values: string[]) {
  const { count, error } = await supabase
    .from(table as never)
    .select("id", { count: "exact", head: true })
    .in(column, values);
  if (error) return 0;
  return count ?? 0;
}

export type AdminAlerts = {
  verifications: number;
  principals: number;
  moderation: number;
  growth: number;
};

/** Counts of items waiting on an admin decision, used for the green dots. */
export function useAdminAlerts(enabled: boolean) {
  return useQuery<AdminAlerts>({
    queryKey: ["admin-alerts"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [verifications, principals, reports, speakers, sponsorships] = await Promise.all([
        countRows("school_verifications", "status", ["pending"]),
        countRows("resource_principal_applications", "status", ["under_review", "pending"]),
        countRows("content_reports", "status", ["open", "pending"]),
        countRows("speaker_requests", "status", ["new", "pending"]),
        countRows("sponsorships", "status", ["new", "pending"]),
      ]);
      return {
        verifications,
        principals,
        moderation: reports,
        growth: speakers + sponsorships,
      };
    },
  });
}
