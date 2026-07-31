import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/my-learning")({
  head: () => ({
    meta: [
      { title: "My Learning — AceEdX" },
      {
        name: "description",
        content: "Continue your AceEdX courses and see the webinars you have registered for.",
      },
      { property: "og:title", content: "My Learning — AceEdX" },
      { property: "og:description", content: "Your courses, progress and registered webinars." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MyLearningPage,
});

function MyLearningPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [loading, user, navigate]);

  const enrollments = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("id, progress, completed_at, courses(id, slug, title, topic, duration_hours)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const registrations = useQuery({
    queryKey: ["my-registrations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_registrations")
        .select("id, attended, webinars(id, slug, title, starts_at, status)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loading || enrollments.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  const courses = enrollments.data ?? [];
  const inProgress = courses.filter((e) => (e.progress ?? 0) < 100);
  const done = courses.filter((e) => (e.progress ?? 0) >= 100);
  const webinars = registrations.data ?? [];

  return (
    <PageShell>
      <PageHeading
        eyebrow="My learning"
        title="Everything you're working on"
        description="Pick up where you left off, revisit completed courses and check your upcoming webinars."
      />
      <div className="container-page py-10">
        <Tabs defaultValue="progress">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="progress">In progress ({inProgress.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({done.length})</TabsTrigger>
            <TabsTrigger value="webinars">Webinars ({webinars.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="progress">
            <CourseList rows={inProgress} emptyLabel="You haven't started a course yet." />
          </TabsContent>
          <TabsContent value="completed">
            <CourseList rows={done} emptyLabel="Finish a course to see it here." />
          </TabsContent>
          <TabsContent value="webinars">
            {webinars.length === 0 ? (
              <EmptyState
                title="No webinar registrations"
                description="Register for a live session to see it listed here."
                action={
                  <Button variant="brand" asChild>
                    <Link to="/webinars">Browse webinars</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {webinars.map((r) => {
                  const w = r.webinars as { slug: string; title: string; starts_at: string } | null;
                  if (!w) return null;
                  return (
                    <div key={r.id} className="card-surface p-5">
                      <h3 className="font-display text-lg font-semibold">{w.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(w.starts_at).toLocaleString()}
                      </p>
                      <Button variant="outline" size="sm" className="mt-4" asChild>
                        <Link to="/webinars/$slug" params={{ slug: w.slug }}>
                          Open session
                        </Link>
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}

function CourseList({
  rows,
  emptyLabel,
}: {
  rows: Array<{ id: string; progress: number | null; courses: unknown }>;
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        description={emptyLabel}
        action={
          <Button variant="brand" asChild>
            <Link to="/courses">Browse courses</Link>
          </Button>
        }
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => {
        const c = row.courses as { slug: string; title: string; topic: string } | null;
        if (!c) return null;
        return (
          <div key={row.id} className="card-surface p-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.topic}</p>
            <h3 className="mt-1 font-display text-lg font-semibold">{c.title}</h3>
            <Progress value={row.progress ?? 0} className="mt-4" />
            <p className="mt-2 text-xs text-muted-foreground">{row.progress ?? 0}% complete</p>
            <Button variant="brand" size="sm" className="mt-4" asChild>
              <Link to="/learn/$slug" params={{ slug: c.slug }}>
                Continue
              </Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
