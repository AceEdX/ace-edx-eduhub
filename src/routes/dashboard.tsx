import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, BookOpen, Flame, Video } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Course, Webinar } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — AceEdX" },
      {
        name: "description",
        content: "Continue your courses, see upcoming webinars and track learning hours on AceEdX.",
      },
      { property: "og:title", content: "Your dashboard — AceEdX" },
      { property: "og:description", content: "Your personalised school leadership learning hub." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [loading, user, navigate]);

  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const enrollments = useQuery({
    queryKey: ["enrollments", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        progress: number;
        courses: Course;
      }>;
    },
  });

  const registrations = useQuery({
    queryKey: ["registrations", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinar_registrations")
        .select("*, webinars(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; webinars: Webinar }>;
    },
  });

  const certificates = useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", user!.id)
        .eq("revoked", false);
      return data ?? [];
    },
  });

  if (loading || !user) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  const stats = [
    { icon: BookOpen, label: "Courses in progress", value: (enrollments.data ?? []).length },
    { icon: Flame, label: "Day streak", value: profile.data?.streak_days ?? 0 },
    { icon: Award, label: "Certificates", value: (certificates.data ?? []).length },
    { icon: Video, label: "Learning hours", value: profile.data?.learning_hours ?? 0 },
  ];

  return (
    <PageShell>
      <section className="border-b border-border bg-primary py-12 text-primary-foreground">
        <div className="container-page">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground/60">
            Dashboard
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold">
            Welcome back{profile.data?.full_name ? `, ${profile.data.full_name.split(" ")[0]}` : ""}
          </h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-primary-foreground/10 p-5">
                <s.icon className="h-5 w-5 opacity-80" />
                <p className="mt-3 font-display text-2xl font-semibold">{s.value}</p>
                <p className="text-xs opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="font-display text-xl font-semibold">Continue learning</h2>
          {(enrollments.data ?? []).length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="You haven't enrolled yet"
                description="Pick a course and start building your leadership practice."
                action={
                  <Button variant="brand" asChild>
                    <Link to="/courses">Browse courses</Link>
                  </Button>
                }
              />
            </div>
          ) : (
            <ul className="mt-4 space-y-4">
              {(enrollments.data ?? []).map((e) => (
                <li key={e.id} className="card-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{e.courses?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.progress}% complete
                      </p>
                    </div>
                    <Button variant="brand" size="sm" asChild>
                      <Link to="/learn/$slug" params={{ slug: e.courses.slug }}>
                        {e.progress > 0 ? "Resume" : "Start"}
                      </Link>
                    </Button>
                  </div>
                  <Progress value={e.progress} className="mt-4" />
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Your webinars</h2>
            {(registrations.data ?? []).length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No registrations yet.{" "}
                <Link to="/webinars" className="font-semibold text-accent">
                  Find a session
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {(registrations.data ?? []).map((r) => (
                  <li key={r.id} className="text-sm">
                    <Link
                      to="/webinars/$slug"
                      params={{ slug: r.webinars.slug }}
                      className="font-medium hover:text-accent"
                    >
                      {r.webinars.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.webinars.starts_at).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Certificates</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {(certificates.data ?? []).length} issued and verifiable.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/certificates">View certificates</Link>
            </Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
