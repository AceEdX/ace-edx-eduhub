import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { WebinarCard } from "@/components/cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { webinarsQuery } from "@/lib/api";

export const Route = createFileRoute("/webinars/")({
  head: () => ({
    meta: [
      { title: "Live & Recorded Webinars for School Leaders — AceEdX" },
      {
        name: "description",
        content:
          "Register for live webinars or watch recorded sessions on AI, wellbeing, assessment, admissions and school leadership.",
      },
      { property: "og:title", content: "Webinars for School Leaders — AceEdX" },
      {
        property: "og:description",
        content: "Live and recorded expert sessions with attendance certificates.",
      },
    ],
  }),
  component: WebinarsPage,
});

const TABS = ["Upcoming", "Recorded", "All"] as const;

function WebinarsPage() {
  const { data, isLoading } = useQuery(webinarsQuery);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Upcoming");
  const [price, setPrice] = useState("All");
  const [term, setTerm] = useState("");

  const filtered = (data ?? []).filter((w) => {
    const matchesTab = tab === "All" || (tab === "Upcoming" ? w.status === "upcoming" : w.status === "recorded");
    const matchesPrice = price === "All" || (price === "Free" ? w.is_free : !w.is_free);
    const q = term.trim().toLowerCase();
    const matchesTerm =
      !q || w.title.toLowerCase().includes(q) || (w.description ?? "").toLowerCase().includes(q);
    return matchesTab && matchesPrice && matchesTerm;
  });

  return (
    <PageShell>
      <PageHeading
        eyebrow="Webinars"
        title="Live sessions and recordings"
        description="Join live expert sessions or catch up on the archive. Attend 75% of a live session and your participation certificate is issued automatically."
      />
      <div className="container-page py-10">
        <div className="card-surface mb-8 space-y-4 p-5">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search webinars"
            aria-label="Search webinars"
            className="h-11"
          />
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  tab === t ? "border-accent bg-accent-soft text-accent" : "border-border bg-card"
                }`}
              >
                {t}
              </button>
            ))}
            <span className="mx-2 hidden w-px bg-border sm:block" />
            {["All", "Free", "Paid"].map((p) => (
              <button
                key={p}
                onClick={() => setPrice(p)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                  price === p ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No webinars here yet"
            description="Try the recorded archive or clear your filters — new sessions are added every week."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => (
              <WebinarCard key={w.id} webinar={w} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
