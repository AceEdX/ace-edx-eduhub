import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { INTEREST_AREAS } from "@/lib/brand";
import { myApplicationQuery, myVerificationQuery, statusLabel } from "@/lib/principals";

export const Route = createFileRoute("/become-a-resource-principal")({
  head: () => ({
    meta: [
      { title: "Become a Resource Principal — AceEdX" },
      {
        name: "description",
        content:
          "Apply to teach masterclasses, host webinars and mentor peers as a Resource Principal on the AceEdX network, with revenue sharing on paid sessions.",
      },
      { property: "og:title", content: "Become a Resource Principal — AceEdX" },
      {
        property: "og:description",
        content: "Teach, speak and earn as a verified school leader on AceEdX.",
      },
    ],
  }),
  component: ApplyPage,
});

const BENEFITS = [
  "Host paid and free webinars with revenue sharing on every ticket",
  "Publish masterclasses and courses to a verified principal audience",
  "A premium public profile in the Resource Principal directory",
  "Priority placement in the community feed and Learning Hub",
  "Conduct your own webinars and masterclasses over YouTube Live, Zoom or a direct link",
];

function ApplyPage() {
  const { user, loading } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const verification = useQuery(myVerificationQuery(user?.id));
  const application = useQuery(myApplicationQuery(user?.id));

  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [topics, setTopics] = useState("");
  const [credentials, setCredentials] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const a = application.data;
    if (!a) return;
    setHeadline(a.headline ?? "");
    setBio(a.bio ?? "");
    setExpertise(a.expertise ?? []);
    setTopics((a.speaking_topics ?? []).join(", "));
    setCredentials(a.credentials ?? "");
    setSampleUrl(a.sample_work_url ?? "");
    setLinkedinUrl(a.linkedin_url ?? "");
  }, [application.data]);

  async function submit() {
    if (!user) return;
    if (bio.trim().length < 60) {
      toast.error("Tell us a little more — at least a couple of sentences about your leadership work");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("resource_principal_applications").upsert(
      {
        user_id: user.id,
        headline: headline.trim() || null,
        bio: bio.trim(),
        expertise,
        speaking_topics: topics
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        credentials: credentials.trim() || null,
        sample_work_url: sampleUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        status: "under_review",
      },
      { onConflict: "user_id" },
    );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application submitted — start your free month of PrincipalX Pro");
    qc.invalidateQueries({ queryKey: ["my-rp-application", user.id] });
    navigate({ to: "/pricing" });
  }

  if (loading || verification.isLoading || application.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  const verified = verification.data?.status === "verified";

  return (
    <PageShell>
      <PageHeading
        eyebrow="Faculty"
        title="Become a Resource Principal"
        description="Turn your leadership practice into masterclasses, webinars and mentoring for principals across the network — and earn a share of every paid session."
      />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="card-surface p-6">
          {!user ? (
            <EmptyState
              title="Sign in to apply"
              description="Applications are open to verified principals on the network."
              action={
                <Button variant="brand" asChild>
                  <Link to="/auth" search={{ mode: "signin" }}>
                    Sign in
                  </Link>
                </Button>
              }
            />
          ) : !verified ? (
            <EmptyState
              title="Verification required"
              description="Resource Principal applications open once your school affiliation has been verified."
              action={
                <Button variant="brand" asChild>
                  <Link to="/verification">Check my verification</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-5">
              {application.data && (
                <p className="rounded-xl bg-secondary p-4 text-sm">
                  Current status:{" "}
                  <span className="font-semibold">{statusLabel(application.data.status)}</span>
                  {application.data.admin_notes ? ` — ${application.data.admin_notes}` : ""}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="headline">Professional headline</Label>
                <Input
                  id="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Principal turning around a 2,000-student CBSE school"
                  maxLength={140}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Why you, and what you would teach</Label>
                <Textarea
                  id="bio"
                  rows={6}
                  maxLength={1500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your leadership track record, the outcomes you have delivered and the sessions you want to run."
                />
              </div>
              <div className="space-y-2">
                <Label>Areas of expertise</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_AREAS.map((area) => {
                    const active = expertise.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() =>
                          setExpertise(
                            active ? expertise.filter((e) => e !== area) : [...expertise, area],
                          )
                        }
                        className={`rounded-full border px-3.5 py-2 text-sm transition-colors ${
                          active
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-border bg-card hover:border-accent/50"
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topics">Speaking topics (comma separated)</Label>
                <Input
                  id="topics"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Teacher retention, AI policy, admissions growth"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credentials">Credentials and recognition</Label>
                <Textarea
                  id="credentials"
                  rows={4}
                  maxLength={800}
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  placeholder="Degrees, awards, board roles, publications, keynote history."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sample">Sample talk or article link</Label>
                  <Input
                    id="sample"
                    value={sampleUrl}
                    onChange={(e) => setSampleUrl(e.target.value)}
                    placeholder="https://"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="li">LinkedIn</Label>
                  <Input
                    id="li"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/…"
                  />
                </div>
              </div>
              <Button variant="brand" disabled={busy} onClick={submit}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
              </Button>
            </div>
          )}
        </div>

        <aside className="card-surface h-fit p-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <Sparkles className="h-3.5 w-3.5" /> What you get
          </span>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {BENEFITS.map((b) => (
              <li key={b}>• {b}</li>
            ))}
          </ul>

          {application.data && (
            <div className="mt-6 rounded-xl border border-accent/40 bg-accent-soft/40 p-4">
              <p className="text-sm font-semibold">Next step: activate PrincipalX Pro</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Resource Principals host webinars and masterclasses on a Pro membership. Activate it
                now so your studio is ready the moment your application is approved.
              </p>
              <Button variant="brand" size="sm" className="mt-3" asChild>
                <Link to="/pricing">Activate PrincipalX Pro</Link>
              </Button>
              <Button variant="ghost" size="sm" className="mt-2 w-full" asChild>
                <Link to="/studio">Open the Principal Studio</Link>
              </Button>
            </div>
          )}
        </aside>
      </div>
    </PageShell>
  );
}
