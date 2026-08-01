import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, Copy } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Certificate } from "@/lib/api";
import { CertificateDownloadButton } from "@/components/CertificateArtwork";

export const Route = createFileRoute("/certificates")({
  head: () => ({
    meta: [
      { title: "Your certificates — AceEdX" },
      {
        name: "description",
        content: "View, share and verify the certificates you have earned on AceEdX.",
      },
      { property: "og:title", content: "Your certificates — AceEdX" },
      { property: "og:description", content: "Verifiable credentials for school leaders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [loading, user, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user!.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Certificate[];
    },
  });

  function copyLink(id: string) {
    const url = `${window.location.origin}/verify/${id}`;
    void navigator.clipboard.writeText(url);
    toast.success("Verification link copied");
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Credentials"
        title="Your certificates"
        description="Every certificate carries a unique ID and a public verification link you can add to LinkedIn or share with your board."
      />
      <div className="container-page py-10">
        {isLoading || loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : (data ?? []).length === 0 ? (
          <EmptyState
            title="No certificates yet"
            description="Complete a course or attend a live webinar to earn your first credential."
            action={
              <Button variant="brand" asChild>
                <Link to="/courses">Browse courses</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {(data ?? []).map((c) => (
              <article key={c.id} className="card-surface overflow-hidden">
                <div className="border-b border-border bg-primary-soft px-6 py-4">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                    <BadgeCheck className="h-4 w-4" />
                    {c.kind === "webinar" ? "Participation" : "Completion"} certificate
                  </p>
                </div>
                <div className="space-y-2 px-6 py-5">
                  <h2 className="font-display text-lg font-semibold">{c.title}</h2>
                  <p className="text-sm text-muted-foreground">Awarded to {c.recipient_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{c.certificate_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Issued {new Date(c.issued_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
                  <Button size="sm" variant="brand" asChild>
                    <Link to="/verify/$certificateId" params={{ certificateId: c.certificate_id }}>
                      Verify
                    </Link>
                  </Button>
                  <CertificateDownloadButton certificate={c} variant="outline" size="sm" />
                  <Button size="sm" variant="outline" onClick={() => copyLink(c.certificate_id)}>
                    <Copy className="h-4 w-4" /> Copy link
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
