import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Sparkles } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Pill } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { resourcePrincipalsQuery } from "@/lib/principals";

export const Route = createFileRoute("/resource-principals/")({
  head: () => ({
    meta: [
      { title: "Resource Principals — expert school leaders on AceEdX" },
      {
        name: "description",
        content:
          "Browse verified Resource Principals who teach masterclasses, host webinars and mentor school leaders across boards and regions.",
      },
      { property: "og:title", content: "Resource Principals — expert school leaders" },
      {
        property: "og:description",
        content: "Verified principals who teach, speak and mentor across the AceEdX network.",
      },
    ],
  }),
  component: ResourcePrincipalsPage,
});

function ResourcePrincipalsPage() {
  const [term, setTerm] = useState("");
  const list = useQuery(resourcePrincipalsQuery);

  const filtered = (list.data ?? []).filter((p) => {
    const q = term.trim().toLowerCase();
    if (!q) return true;
    return [p.display_name, p.headline, p.city, p.country, ...p.expertise, ...p.speaking_topics]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  return (
    <PageShell>
      <PageHeading
        eyebrow="Faculty"
        title="Resource Principals"
        description="Practising school leaders selected to teach, speak and mentor across the network. Every Resource Principal is verified and reviewed before they publish."
      />
      <div className="container-page py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by name, expertise, topic or city"
            aria-label="Search Resource Principals"
            className="h-11 max-w-md rounded-full"
          />
          <Button variant="brand" asChild>
            <Link to="/become-a-resource-principal">
              <Sparkles className="h-4 w-4" /> Apply to become one
            </Link>
          </Button>
        </div>

        <div className="mt-8">
          {list.isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No Resource Principals yet"
              description="Approved Resource Principals appear here. If you lead a school and want to teach, apply above."
              action={
                <Button variant="brand" asChild>
                  <Link to="/become-a-resource-principal">Apply now</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to="/resource-principals/$slug"
                  params={{ slug: p.slug }}
                  className="card-surface flex flex-col p-6 transition-colors hover:border-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                      {p.display_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold">{p.display_name}</h2>
                      <p className="text-xs text-muted-foreground">{p.headline ?? p.school_name}</p>
                    </div>
                  </div>
                  {(p.city || p.country) && (
                    <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {[p.city, p.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {p.expertise.slice(0, 3).map((e) => (
                      <Pill key={e}>{e}</Pill>
                    ))}
                  </div>
                  {p.featured && (
                    <span className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">
                      Featured
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
