import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { ExpertCard } from "@/components/cards";
import { Skeleton } from "@/components/ui/skeleton";
import { expertsQuery } from "@/lib/api";

export const Route = createFileRoute("/experts/")({
  head: () => ({
    meta: [
      { title: "Expert Directory — AceEdX" },
      {
        name: "description",
        content:
          "Meet the principals, researchers and consultants teaching on AceEdX — search by expertise, organisation and country.",
      },
      { property: "og:title", content: "Expert Directory — AceEdX" },
      { property: "og:description", content: "Education leadership experts teaching on AceEdX." },
    ],
  }),
  component: ExpertsPage,
});

function ExpertsPage() {
  const { data, isLoading } = useQuery(expertsQuery);
  return (
    <PageShell>
      <PageHeading
        eyebrow="Faculty"
        title="Expert directory"
        description="Practising school leaders, researchers and consultants who teach, host webinars and answer community questions."
      />
      <div className="container-page py-10">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(data ?? []).map((e) => (
              <ExpertCard key={e.id} expert={e} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
