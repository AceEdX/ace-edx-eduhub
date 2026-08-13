import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { myVerificationQuery } from "@/lib/principals";

export const Route = createFileRoute("/verification")({
  head: () => ({
    meta: [
      { title: "Verification status — AceEdX PrincipalX" },
      {
        name: "description",
        content:
          "Track the review of your school affiliation and unlock the verified principal community on AceEdX PrincipalX.",
      },
      { property: "og:title", content: "Verification status — AceEdX PrincipalX" },
      {
        property: "og:description",
        content: "Every principal on PrincipalX is verified against their school affiliation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationPage,
});

const STAGES = [
  { key: "submitted", title: "Application submitted", body: "We have your school and affiliation details." },
  { key: "review", title: "Under review", body: "Our team checks the affiliation number against the board record." },
  { key: "verified", title: "Verified principal", body: "Your badge is live and the full network unlocks." },
];

function VerificationPage() {
  const { user, loading } = useAuth();
  const verification = useQuery(myVerificationQuery(user?.id));

  if (loading || verification.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Sign in to see your verification"
            description="Your verification status is private to your account."
            action={
              <Button variant="brand" asChild>
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign in
                </Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  const row = verification.data;
  const status = row?.status ?? "missing";
  const activeStage = status === "verified" ? 2 : status === "pending" ? 1 : 0;

  return (
    <PageShell>
      <PageHeading
        eyebrow="Membership"
        title="Your principal verification"
        description="PrincipalX is a closed professional network. Every member is checked against a real school affiliation before they can post, connect or teach."
      />
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.3fr_1fr]">
        <div className="card-surface p-6">
          {status === "missing" ? (
            <EmptyState
              title="No verification on file"
              description="Add your school affiliation details from your profile so our team can verify you."
              action={
                <Button variant="brand" asChild>
                  <Link to="/profile">Complete my profile</Link>
                </Button>
              }
            />
          ) : (
            <>
              <div className="flex items-center gap-3">
                {status === "verified" ? (
                  <ShieldCheck className="h-6 w-6 text-success" />
                ) : status === "rejected" || status === "suspended" ? (
                  <ShieldAlert className="h-6 w-6 text-destructive" />
                ) : (
                  <Clock className="h-6 w-6 text-accent" />
                )}
                <div>
                  <h2 className="font-display text-xl font-semibold">
                    {status === "verified"
                      ? "You are a verified principal"
                      : status === "rejected"
                        ? "We could not verify these details"
                        : status === "suspended"
                          ? "Your membership is suspended"
                          : "Verification in progress"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Submitted {new Date(row!.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {row?.admin_notes && (
                <p className="mt-4 rounded-xl bg-secondary p-4 text-sm">{row.admin_notes}</p>
              )}

              <ol className="mt-8 space-y-5">
                {STAGES.map((stage, i) => (
                  <li key={stage.key} className="flex gap-3">
                    <CheckCircle2
                      className={`mt-0.5 h-5 w-5 shrink-0 ${
                        i <= activeStage ? "text-success" : "text-muted-foreground/40"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold">{stage.title}</p>
                      <p className="text-xs text-muted-foreground">{stage.body}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                <Detail label="School" value={row!.school_name} />
                <Detail label="Designation" value={row!.designation ?? "—"} />
                <Detail label="Board" value={row!.board ?? "—"} />
                <Detail
                  label="Affiliation number"
                  value={`••••${row!.affiliation_number.slice(-4)}`}
                />
              </dl>
            </>
          )}
        </div>

        <aside className="card-surface h-fit p-6">
          <h3 className="font-display text-lg font-semibold">While you wait</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You can already browse learning and resources. Posting in the community and applying as a
            Resource Principal unlock once you are verified.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button variant="brand" asChild>
              <Link to="/courses">Browse the Learning Hub</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/resource-principals">Meet Resource Principals</Link>
            </Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
