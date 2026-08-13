import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";

export type SchoolVerification = {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string | null;
  school_name: string;
  affiliation_number: string;
  board: string | null;
  designation: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  school_website: string | null;
  linkedin_url: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type ResourcePrincipalApplication = {
  id: string;
  user_id: string;
  headline: string | null;
  bio: string;
  expertise: string[];
  speaking_topics: string[];
  credentials: string | null;
  sample_work_url: string | null;
  linkedin_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

export type ResourcePrincipal = {
  id: string;
  user_id: string;
  slug: string;
  display_name: string;
  headline: string | null;
  school_name: string | null;
  city: string | null;
  country: string | null;
  bio: string | null;
  expertise: string[];
  speaking_topics: string[];
  credentials: string | null;
  photo_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  status: string;
  featured: boolean;
  revenue_share_pct: number;
};

export const SCHOOL_BOARDS = [
  "CBSE",
  "ICSE / CISCE",
  "State Board",
  "IB",
  "Cambridge / CAIE",
  "NIOS",
  "Other / International",
] as const;

export const APPLICATION_STATUSES = [
  "applicant",
  "under_review",
  "approved",
  "active",
  "suspended",
  "rejected",
] as const;

export function statusLabel(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------- queries ------------------------------- */

export const myVerificationQuery = (userId: string | undefined) => ({
  queryKey: ["my-verification", userId],
  enabled: Boolean(userId),
  queryFn: async (): Promise<SchoolVerification | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("school_verifications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as SchoolVerification | null;
  },
});

export const myApplicationQuery = (userId: string | undefined) => ({
  queryKey: ["my-rp-application", userId],
  enabled: Boolean(userId),
  queryFn: async (): Promise<ResourcePrincipalApplication | null> => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("resource_principal_applications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as ResourcePrincipalApplication | null;
  },
});

export const resourcePrincipalsQuery = {
  queryKey: ["resource-principals"],
  queryFn: async (): Promise<ResourcePrincipal[]> => {
    const { data, error } = await supabase
      .from("resource_principals")
      .select("*")
      .order("featured", { ascending: false })
      .order("display_name");
    if (error) throw error;
    return (data ?? []) as ResourcePrincipal[];
  },
};

export const resourcePrincipalQuery = (slug: string) => ({
  queryKey: ["resource-principal", slug],
  queryFn: async (): Promise<ResourcePrincipal | null> => {
    const { data, error } = await supabase
      .from("resource_principals")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as ResourcePrincipal | null;
  },
});

export const platformSettingsQuery = {
  queryKey: ["platform-settings"],
  queryFn: async (): Promise<Record<string, unknown>> => {
    const { data, error } = await supabase.from("platform_settings").select("key, value");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  },
};

/* ------------------------------- admin --------------------------------- */

export const verificationQueueQuery = (status: string) => ({
  queryKey: ["admin-verifications", status],
  queryFn: async (): Promise<SchoolVerification[]> => {
    let q = supabase.from("school_verifications").select("*").order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as SchoolVerification[];
  },
});

export const applicationsQueueQuery = (status: string) => ({
  queryKey: ["admin-rp-applications", status],
  queryFn: async (): Promise<(ResourcePrincipalApplication & { profile?: { full_name: string } })[]> => {
    let q = supabase
      .from("resource_principal_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as ResourcePrincipalApplication[];
  },
});

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
