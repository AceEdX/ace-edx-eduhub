import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Route as RouteIcon, GraduationCap } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/cards";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type PathItem = {
  id: string;
  step_order: number;
  item_type: string;
  label: string | null;
  courses?: { title: string; slug: string } | null;
  webinars?: { title: string; slug: string } | null;
  resources?: { title: string; slug: string } | null;
};

type LearningPath = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  audience: string | null;
  level: string;
  learning_path_items: PathItem[];
};

const pathsQuery = {
  queryKey: ["learning-paths"],
  queryFn: async (): Promise<LearningPath[]> => {
    const { data, error } = await supabase
      .from("learning_paths")
      .select(
        "*, learning_path_items(id, step_order, item_type, label, courses(title, slug), webinars(title, slug), resources(title, slug))",
      )
      .eq("published", true)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as LearningPath[];
  },
};

export const Route = createFileRoute("/learning-paths/")({
  head: () => ({
    meta: [
      { title: "Learning paths for principals and school owners — AceEdX" },
      {
        name: "description",
        content:
          "Guided sequences of courses, masterclasses and toolkits that take school leaders from first principles to confident practice.",
      },
      { property: "og:title", content: "Guided learning paths for school leaders" },
      {
        property: "og:description",
        content: "Structured journeys combining courses, webinars and toolkits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LearningPathsPage,
});

function itemLabel(item: PathItem) {
  return (
    item.label ??
    item.courses?.title ??
    item.webinars?.title ??
    item.resources?.title ??
    "Step"
  );
}

function LearningPathsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const paths = useQuery(pathsQuery);

  const enrolled = useQuery({
    queryKey: ["path-enrollments", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_path_enrollments")
        .select("path_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.path_id as string);
    },
  });

  async function join(pathId: string) {
    if (!user) {
      toast.error("Sign in to start a learning path");
      return;
    }
    const { error } = await supabase
      .from("learning_path_enrollments")
      .insert({ user_id: user.id, path_id: pathId });
    if (error) {
      toast.error("Could not start this path");
      return;
    }
    toast.success("Path added to your learning");
    qc.invalidateQueries({ queryKey: ["path-enrollments", user.id] });
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Guided journeys"
        title="Learning paths"
        description="Curated sequences that stack courses, masterclasses and toolkits in the right order — so leadership development is a programme, not a pile of links."
      />
      <div className="container-page py-10">
        {paths.isLoading ? (
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : (paths.data ?? []).length === 0 ? (
          <EmptyState
            title="Learning paths are being curated"
            description="Our faculty is sequencing the first cohort of paths. In the meantime, explore the Learning Hub for live and recorded programmes."
            action={
              <Button variant="brand" asChild>
                <Link to="/learning-hub">Open Learning Hub</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {(paths.data ?? []).map((p) => {
              const items = [...(p.learning_path_items ?? [])].sort(
                (a, b) => a.step_order - b.step_order,
              );
              const isIn = (enrolled.data ?? []).includes(p.id);
              return (
                <article key={p.id} className="card-surface p-6">
                  <div className="flex items-center gap-2">
                    <RouteIcon className="h-4 w-4 text-accent" />
                    <Pill>{p.level}</Pill>
                    {p.audience && <Pill>{p.audience}</Pill>}
                  </div>
                  <h2 className="mt-3 font-display text-xl font-semibold">{p.title}</h2>
                  {p.summary && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {p.summary}
                    </p>
                  )}
                  <ol className="mt-5 space-y-2">
                    {items.map((it, i) => (
                      <li key={it.id} className="flex items-start gap-3 text-sm">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                          {i + 1}
                        </span>
                        <span className="flex-1">
                          {it.courses ? (
                            <Link
                              to="/courses/$slug"
                              params={{ slug: it.courses.slug }}
                              className="hover:text-accent"
                            >
                              {itemLabel(it)}
                            </Link>
                          ) : it.webinars ? (
                            <Link
                              to="/webinars/$slug"
                              params={{ slug: it.webinars.slug }}
                              className="hover:text-accent"
                            >
                              {itemLabel(it)}
                            </Link>
                          ) : (
                            itemLabel(it)
                          )}
                          <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                            {it.item_type}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                  <Button
                    className="mt-6"
                    variant={isIn ? "success" : "brand"}
                    disabled={isIn}
                    onClick={() => join(p.id)}
                  >
                    <GraduationCap className="h-4 w-4" />
                    {isIn ? "Path started" : "Start this path"}
                  </Button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
