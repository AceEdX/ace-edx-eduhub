import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { ResourceCard } from "@/components/cards";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { resourcesQuery } from "@/lib/api";

export const Route = createFileRoute("/resources/")({
  head: () => ({
    meta: [
      { title: "Resource Library & Principal's Toolkit — AceEdX" },
      {
        name: "description",
        content:
          "Download templates, checklists and toolkits for school improvement, teacher observation, AI policy, wellbeing and crisis management.",
      },
      { property: "og:title", content: "Resource Library & Principal's Toolkit — AceEdX" },
      {
        property: "og:description",
        content: "Practical downloadable tools for school leaders.",
      },
    ],
  }),
  component: ResourcesPage,
});

function ResourcesPage() {
  const { data, isLoading } = useQuery(resourcesQuery);
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [onlyToolkit, setOnlyToolkit] = useState(false);

  const categories = ["All", ...Array.from(new Set((data ?? []).map((r) => r.category))).sort()];

  const filtered = (data ?? []).filter((r) => {
    const q = term.trim().toLowerCase();
    return (
      (!q || r.title.toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q)) &&
      (category === "All" || r.category === category) &&
      (!onlyToolkit || r.is_toolkit)
    );
  });

  return (
    <PageShell>
      <PageHeading
        eyebrow="Resources"
        title="Resource library & Principal's Toolkit"
        description="Practical templates, checklists and toolkits you can use in school this week."
      />
      <div className="container-page py-10">
        <div className="card-surface mb-8 space-y-4 p-5">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search resources"
            aria-label="Search resources"
            className="h-11"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOnlyToolkit((v) => !v)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                onlyToolkit ? "border-accent bg-accent-soft text-accent" : "border-border bg-card"
              }`}
            >
              Principal&apos;s Toolkit only
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  category === c
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-card"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No resources match"
            description="Try a different category or clear your search."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
