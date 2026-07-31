import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Award, Clock, Layers, Star, Users } from "lucide-react";
import { PageShell, EmptyState } from "@/components/layout/PageShell";
import { Pill } from "@/components/cards";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { courseQuery, lessonsQuery } from "@/lib/api";
import { formatPrice } from "@/lib/brand";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/courses/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — AceEdX course` },
      {
        name: "description",
        content:
          "A practical leadership course on AceEdX with modules, assessment and a verifiable certificate.",
      },
      { property: "og:title", content: "AceEdX course for school leaders" },
      {
        property: "og:description",
        content: "Enrol in a practical leadership course with a verifiable certificate.",
      },
    ],
  }),
  component: CourseDetail,
});

const FAQS = [
  {
    q: "How long do I have access?",
    a: "Lifetime access to every lesson, resource and future update to the course.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes. Complete every lesson and the final assessment and your certificate is issued instantly with a unique verification ID.",
  },
  {
    q: "Can my whole leadership team enrol?",
    a: "Institution plans allow bulk enrolment with a shared progress dashboard. Contact us for team pricing.",
  },
];

function CourseDetail() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const course = useQuery(courseQuery(slug));
  const lessons = useQuery(lessonsQuery(course.data?.id));

  const modules = groupModules(lessons.data ?? []);

  async function enrol() {
    if (!user) {
      navigate({ to: "/auth", search: { mode: "signup" } });
      return;
    }
    const data = course.data;
    if (!data) return;

    if (!data.is_free) {
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        item_type: "course",
        item_id: data.id,
        item_title: data.title,
        amount_inr: data.price_inr,
        status: "pending",
        provider: "razorpay",
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.info(
        "Razorpay checkout is not connected yet — your order is saved and access has been granted for preview.",
      );
    }

    const { error } = await supabase
      .from("enrollments")
      .upsert({ user_id: user.id, course_id: data.id }, { onConflict: "user_id,course_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["enrollments"] });
    toast.success("You're enrolled");
    navigate({ to: "/learn/$slug", params: { slug } });
  }

  if (course.isLoading) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!course.data) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Course unavailable"
            description="This course may have been unpublished or the link is incorrect."
            action={
              <Button variant="brand" asChild>
                <Link to="/courses">Browse all courses</Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  const c = course.data;

  return (
    <PageShell>
      <section className="border-b border-border bg-primary py-14 text-primary-foreground">
        <div className="container-page grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/70">
              {c.topic} · {c.level}
            </p>
            <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{c.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/80">
              {c.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-primary-foreground/80">
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4" /> {c.rating} rating
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {c.learners.toLocaleString()} learners
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {c.duration_hours} hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers className="h-4 w-4" /> {modules.length} modules
              </span>
            </div>
          </div>

          <aside className="card-surface h-fit p-6 text-foreground">
            <p className="font-display text-3xl font-semibold">
              {formatPrice(c.price_inr, c.is_free)}
            </p>
            {!c.is_free && (
              <p className="mt-1 text-xs text-muted-foreground">One-time payment via Razorpay</p>
            )}
            <Button variant="brand" size="lg" className="mt-5 w-full" onClick={enrol}>
              {c.is_free ? "Enrol now" : "Buy course"}
            </Button>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Award className="h-4 w-4 text-success" /> Verifiable certificate
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-success" /> Lifetime access
              </li>
              <li className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-success" /> Downloadable templates
              </li>
            </ul>
          </aside>
        </div>
      </section>

      <div className="container-page grid gap-12 py-14 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold">What you will be able to do</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {c.outcomes.map((o) => (
                <li key={o} className="card-surface p-4 text-sm">
                  {o}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Course curriculum</h2>
            <div className="mt-4 space-y-3">
              {modules.map((m) => (
                <div key={m.title} className="card-surface p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base font-semibold">{m.title}</h3>
                    <span className="text-xs text-muted-foreground">{m.lessons.length} lessons</span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {m.lessons.map((l) => (
                      <li key={l.id} className="flex justify-between text-sm text-muted-foreground">
                        <span>{l.title}</span>
                        <span className="text-xs">{l.duration_min} min</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-4">
              {FAQS.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>

        <aside className="space-y-8">
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold">Your instructor</h2>
            <p className="mt-3 text-sm font-semibold">{c.experts?.name ?? "AceEdX Faculty"}</p>
            <p className="text-xs text-muted-foreground">{c.experts?.title}</p>
            <p className="text-xs text-muted-foreground">{c.experts?.organisation}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.experts?.bio}</p>
          </div>
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold">Who should take this?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {c.audience.map((a) => (
                <Pill key={a} tone="primary">
                  {a}
                </Pill>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

export function groupModules<T extends { module_title: string; module_order: number }>(lessons: T[]) {
  const map = new Map<string, { title: string; order: number; lessons: T[] }>();
  for (const l of lessons) {
    const entry = map.get(l.module_title) ?? {
      title: l.module_title,
      order: l.module_order,
      lessons: [],
    };
    entry.lessons.push(l);
    map.set(l.module_title, entry);
  }
  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}
