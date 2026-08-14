import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { CourseCard, WebinarCard } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { coursesQuery, webinarsQuery, type Webinar } from "@/lib/api";

export const Route = createFileRoute("/learning-hub")({
  head: () => ({
    meta: [
      { title: "Learning Hub for school leaders — AceEdX" },
      {
        name: "description",
        content:
          "Live sessions, masterclasses, workshops, recordings and certified courses for principals and school leaders — all in one hub.",
      },
      { property: "og:title", content: "Learning Hub for school leaders — AceEdX" },
      {
        property: "og:description",
        content: "Live sessions, masterclasses, workshops, recordings and certified courses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearningHubPage,
});

const TABS = [
  { id: "live", label: "Live now" },
  { id: "upcoming", label: "Upcoming" },
  { id: "masterclasses", label: "Masterclasses" },
  { id: "workshops", label: "Workshops" },
  { id: "courses", label: "Courses" },
  { id: "recordings", label: "Recordings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function programType(w: Webinar & { program_type?: string | null }) {
  return w.program_type ?? "webinar";
}

function LearningHubPage() {
  const [tab, setTab] = useState<TabId>("upcoming");
  const webinars = useQuery(webinarsQuery);
  const courses = useQuery(coursesQuery);

  const buckets = useMemo(() => {
    const all = (webinars.data ?? []) as (Webinar & { program_type?: string | null })[];
    const now = Date.now();
    return {
      live: all.filter((w) => w.status === "live"),
      upcoming: all.filter(
        (w) => w.status !== "completed" && new Date(w.starts_at).getTime() >= now,
      ),
      masterclasses: all.filter((w) => programType(w) === "masterclass"),
      workshops: all.filter((w) => programType(w) === "workshop"),
      recordings: all.filter((w) => Boolean(w.recording_url)),
    };
  }, [webinars.data]);

  const loading = webinars.isLoading || courses.isLoading;

  return (
    <PageShell>
      <PageHeading
        eyebrow="Learning Hub"
        title="Everything you are learning, in one place"
        description="Live sessions, masterclasses, workshops, recordings and certified courses built for practising school leaders."
      />
      <div className="container-page py-10">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
                tab === t.id ? "border-primary bg-primary-soft text-primary" : "border-border bg-card"
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/my-learning">My learning</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/certificates">Certificates</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : tab === "courses" ? (
          (courses.data ?? []).length === 0 ? (
            <EmptyState title="No courses yet" description="New certified courses are on the way." />
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(courses.data ?? []).map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )
        ) : buckets[tab].length === 0 ? (
          <EmptyState
            title="Nothing here right now"
            description="Check the other tabs — new sessions are added every week."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {buckets[tab].map((w) => (
              <WebinarCard key={w.id} webinar={w} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
