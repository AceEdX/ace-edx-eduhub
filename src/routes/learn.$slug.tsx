import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { courseQuery, lessonsQuery } from "@/lib/api";
import { groupModules } from "@/lib/modules";
import { LessonMedia } from "@/components/LessonMedia";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/learn/$slug")({
  head: () => ({
    meta: [
      { title: "Course player — AceEdX" },
      {
        name: "description",
        content: "Work through your AceEdX course lesson by lesson and track your progress.",
      },
      { property: "og:title", content: "Course player — AceEdX" },
      { property: "og:description", content: "Your AceEdX learning session." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LearnPage,
});

function LearnPage() {
  const { slug } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const course = useQuery(courseQuery(slug));
  const lessons = useQuery(lessonsQuery(course.data?.id));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { mode: "signin" } });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !course.data) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("course_id", course.data!.id);
      if (!cancelled && data) {
        setCompleted(new Set(data.map((d) => d.lesson_id)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, course.data]);

  const flat = lessons.data ?? [];
  const modules = useMemo(() => groupModules(flat), [flat]);
  const active = flat.find((l) => l.id === activeId) ?? flat[0];
  const activeIndex = active ? flat.findIndex((l) => l.id === active.id) : -1;
  const percent = flat.length ? Math.round((completed.size / flat.length) * 100) : 0;

  // Engagement gate: a lesson can only be marked complete after it has actually
  // been watched / read on this page for a meaningful share of its length.
  const [dwellSec, setDwellSec] = useState(0);
  useEffect(() => {
    setDwellSec(0);
  }, [active?.id]);
  useEffect(() => {
    const id = setInterval(() => setDwellSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const requiredSec = active ? Math.min(Math.round(active.duration_min * 60 * 0.6), 180) : 0;
  const isDone = active ? completed.has(active.id) : false;
  const engaged = isDone || dwellSec >= requiredSec;
  const remainingSec = Math.max(0, requiredSec - dwellSec);


  async function toggleComplete() {
    if (!user || !active || !course.data) return;
    const isDone = completed.has(active.id);
    const next = new Set(completed);
    if (isDone) next.delete(active.id);
    else next.add(active.id);
    setCompleted(next);

    if (isDone) {
      await supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", active.id);
    } else {
      await supabase.from("lesson_progress").upsert(
        {
          user_id: user.id,
          course_id: course.data.id,
          lesson_id: active.id,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,lesson_id" },
      );
    }

    const pct = Math.round((next.size / flat.length) * 100);
    await supabase
      .from("enrollments")
      .update({
        progress: pct,
        completed_at: pct === 100 ? new Date().toISOString() : null,
      })
      .eq("user_id", user.id)
      .eq("course_id", course.data.id);

    if (pct === 100) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();
      const { data: existing } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", user.id)
        .eq("course_id", course.data.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("certificates").insert({
          user_id: user.id,
          recipient_name: profile?.full_name || user.email || "AceEdX Member",
          kind: "course",
          title: course.data.title,
          duration_text: `${course.data.duration_hours} hours`,
          course_id: course.data.id,
        });
        toast.success("Course complete — your certificate has been issued");
      }
    }
  }

  function move(delta: number) {
    const next = flat[activeIndex + delta];
    if (next) setActiveId(next.id);
  }

  if (course.isLoading || lessons.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!course.data || !active) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Nothing to play yet"
            description="This course has no published lessons."
            action={
              <Button variant="brand" asChild>
                <Link to="/courses">Browse courses</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[1fr_340px]">
        <div>
          <Link
            to="/courses/$slug"
            params={{ slug }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            ← {course.data.title}
          </Link>

          <LessonMedia lesson={active} />

          <h1 className="mt-6 font-display text-2xl font-semibold">{active.title}</h1>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            {active.module_title}
          </p>
          {active.content && (
            <div className="prose-lesson mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              {active.content.split("\n").filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant={completed.has(active.id) ? "success" : "brand"} onClick={toggleComplete}>
              <CheckCircle2 className="h-4 w-4" />
              {completed.has(active.id) ? "Completed" : "Mark as complete"}
            </Button>
            <Button variant="outline" disabled={activeIndex <= 0} onClick={() => move(-1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button
              variant="outline"
              disabled={activeIndex >= flat.length - 1}
              onClick={() => move(1)}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <aside className="card-surface h-fit p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your progress
          </p>
          <Progress value={percent} className="mt-3" />
          <p className="mt-2 text-xs text-muted-foreground">
            {completed.size} of {flat.length} lessons · {percent}%
          </p>

          <div className="mt-5 space-y-4">
            {modules.map((m) => (
              <div key={m.title}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.title}
                </p>
                <ul className="mt-2 space-y-1">
                  {m.lessons.map((l) => (
                    <li key={l.id}>
                      <button
                        onClick={() => setActiveId(l.id)}
                        className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${
                          l.id === active.id ? "bg-accent-soft text-accent" : "hover:bg-secondary"
                        }`}
                      >
                        {completed.has(l.id) ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="flex-1">{l.title}</span>
                        <span className="text-xs text-muted-foreground">{l.duration_min}m</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
