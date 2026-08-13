import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Globe, Linkedin, MapPin, ShieldCheck } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/PageShell";
import { Pill } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resourcePrincipalQuery } from "@/lib/principals";

export const Route = createFileRoute("/resource-principals/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Resource Principal on AceEdX` },
      {
        name: "description",
        content:
          "A verified Resource Principal on AceEdX: expertise, speaking topics, credentials and sessions for school leaders.",
      },
      { property: "og:title", content: "Resource Principal — AceEdX" },
      {
        property: "og:description",
        content: "Verified school leader teaching and mentoring on the AceEdX network.",
      },
    ],
  }),
  component: ResourcePrincipalDetail,
});

function ResourcePrincipalDetail() {
  const { slug } = Route.useParams();
  const principal = useQuery(resourcePrincipalQuery(slug));

  if (principal.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  const p = principal.data;
  if (!p) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Resource Principal not found"
            description="This profile may have been unpublished."
            action={
              <Button variant="brand" asChild>
                <Link to="/resource-principals">Back to the directory</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="border-b border-border bg-surface">
        <div className="container-page flex flex-wrap items-start gap-6 py-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
            {p.display_name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-64 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Resource Principal
            </span>
            <h1 className="mt-3 text-3xl font-semibold">{p.display_name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{p.headline ?? p.school_name}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {(p.city || p.country) && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {[p.city, p.country].filter(Boolean).join(", ")}
                </span>
              )}
              {p.linkedin_url && (
                <a
                  href={p.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                </a>
              )}
              {p.website_url && (
                <a
                  href={p.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-foreground"
                >
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>
          </div>
          <Button variant="brand" asChild>
            <Link to="/webinars">See upcoming sessions</Link>
          </Button>
        </div>
      </section>

      <div className="container-page grid gap-8 py-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          {p.bio && (
            <section>
              <h2 className="font-display text-xl font-semibold">About</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.bio}
              </p>
            </section>
          )}
          {p.credentials && (
            <section>
              <h2 className="font-display text-xl font-semibold">Credentials</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                {p.credentials}
              </p>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card-surface p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Expertise
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.expertise.length ? p.expertise.map((e) => <Pill key={e}>{e}</Pill>) : <p className="text-sm text-muted-foreground">Coming soon</p>}
            </div>
          </div>
          <div className="card-surface p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Speaking topics
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {p.speaking_topics.length ? (
                p.speaking_topics.map((t) => <li key={t}>• {t}</li>)
              ) : (
                <li className="text-muted-foreground">Coming soon</li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
