import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { CourseCard } from "@/components/cards";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { coursesQuery } from "@/lib/api";

export const Route = createFileRoute("/courses/")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Courses for School Leaders — AceEdX" },
      {
        name: "description",
        content:
          "Self-paced leadership courses on AI in education, teacher development, wellbeing, curriculum and school growth — free and paid.",
      },
      { property: "og:title", content: "Courses for School Leaders — AceEdX" },
      {
        property: "og:description",
        content: "Practical courses built for principals, owners and academic coordinators.",
      },
    ],
  }),
  component: CoursesPage,
});

const LEVELS = ["All", "Beginner", "Intermediate", "Advanced"];
const PRICES = ["All", "Free", "Paid"];

function CoursesPage() {
  const search = Route.useSearch();
  const { data, isLoading } = useQuery(coursesQuery);
  const [term, setTerm] = useState(search.q ?? "");
  const [topic, setTopic] = useState("All");
  const [level, setLevel] = useState("All");
  const [price, setPrice] = useState("All");

  const topics = useMemo(
    () => ["All", ...Array.from(new Set((data ?? []).map((c) => c.topic))).sort()],
    [data],
  );

  const filtered = (data ?? []).filter((c) => {
    const q = term.trim().toLowerCase();
    const matchesTerm =
      !q ||
      c.title.toLowerCase().includes(q) ||
      (c.summary ?? "").toLowerCase().includes(q) ||
      c.topic.toLowerCase().includes(q);
    const matchesTopic = topic === "All" || c.topic === topic;
    const matchesLevel = level === "All" || c.level === level;
    const matchesPrice = price === "All" || (price === "Free" ? c.is_free : !c.is_free);
    return matchesTerm && matchesTopic && matchesLevel && matchesPrice;
  });

  return (
    <PageShell>
      <PageHeading
        eyebrow="Learn"
        title="Courses for school leaders"
        description="Practical, self-paced programmes with verifiable certificates. Filter by topic, level and price."
      />
      <div className="container-page py-10">
        <div className="card-surface mb-8 space-y-4 p-5">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search courses"
            aria-label="Search courses"
            className="h-11"
          />
          <FilterRow label="Topic" options={topics} value={topic} onChange={setTopic} />
          <FilterRow label="Level" options={LEVELS} value={level} onChange={setLevel} />
          <FilterRow label="Price" options={PRICES} value={price} onChange={setPrice} />
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No courses match those filters"
            description="Try clearing a filter or searching a broader topic such as leadership or assessment."
          />
        ) : (
          <>
            <p className="mb-5 text-sm text-muted-foreground">{filtered.length} courses</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

function FilterRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            value === o
              ? "border-accent bg-accent-soft text-accent"
              : "border-border bg-card hover:border-accent/50"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
