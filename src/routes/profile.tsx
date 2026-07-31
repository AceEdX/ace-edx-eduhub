import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INTEREST_AREAS, PROFESSIONAL_ROLES } from "@/lib/brand";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — AceEdX" },
      {
        name: "description",
        content: "Update your AceEdX professional profile, school details and interest areas.",
      },
      { property: "og:title", content: "My Profile — AceEdX" },
      { property: "og:description", content: "Manage your AceEdX profile details." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

type ProfileForm = {
  full_name: string;
  professional_role: string;
  school_name: string;
  city: string;
  country: string;
  years_in_education: number | null;
  bio: string;
  interests: string[];
};

const EMPTY: ProfileForm = {
  full_name: "",
  professional_role: "",
  school_name: "",
  city: "",
  country: "",
  years_in_education: null,
  bio: "",
  interests: [],
};

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [loading, user, navigate]);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile.data) return;
    setForm({
      full_name: profile.data.full_name ?? "",
      professional_role: profile.data.professional_role ?? "",
      school_name: profile.data.school_name ?? "",
      city: profile.data.city ?? "",
      country: profile.data.country ?? "",
      years_in_education: profile.data.years_in_education ?? null,
      bio: profile.data.bio ?? "",
      interests: profile.data.interests ?? [],
    });
  }, [profile.data]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile updated");
    profile.refetch();
  }

  if (loading || profile.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Profile"
        title="Your professional profile"
        description="Keep your details current so peers and experts know who they're learning with."
      />
      <div className="container-page max-w-3xl py-10">
        <div className="card-surface space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Role</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.professional_role}
                onChange={(e) => setForm({ ...form, professional_role: e.target.value })}
              >
                <option value="">Select a role</option>
                {PROFESSIONAL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">School / organisation</Label>
              <Input
                value={form.school_name}
                onChange={(e) => setForm({ ...form, school_name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Years in education</Label>
              <Input
                type="number"
                min={0}
                value={form.years_in_education ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    years_in_education: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">About you</Label>
            <Textarea
              rows={4}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-xs">Interest areas</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTEREST_AREAS.map((area) => {
                const on = form.interests.includes(area);
                return (
                  <button
                    key={area}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        interests: on
                          ? form.interests.filter((i) => i !== area)
                          : [...form.interests, area],
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on ? "border-accent bg-accent-soft text-accent" : "border-border bg-card"
                    }`}
                  >
                    {area}
                  </button>
                );
              })}
            </div>
          </div>

          <Button variant="brand" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
