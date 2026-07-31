import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-leaders.jpg";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseCard, ExpertCard, PostCard, WebinarCard, Pill } from "@/components/cards";
import { brand } from "@/lib/brand";
import { coursesQuery, expertsQuery, postsQuery, webinarsQuery } from "@/lib/api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AceEdX — Learning & Community for School Leaders" },
      {
        name: "description",
        content:
          "Courses, live webinars, verifiable certificates and a professional community for principals, school owners and academic coordinators.",
      },
      { property: "og:title", content: "AceEdX — Learning & Community for School Leaders" },
      {
        property: "og:description",
        content:
          "Learn from experts. Connect with peers. Discover what works. Lead better schools.",
      },
    ],
  }),
  component: HomePage,
});

const TRENDING = [
  "AI in Education",
  "School Leadership",
  "Teacher Development",
  "Student Wellbeing",
  "Curriculum",
  "Assessment",
  "School Growth",
  "Parent Engagement",
  "Education Technology",
  "Future Skills",
];

const STATS = [
  { value: 10000, suffix: "+", label: "School leaders" },
  { value: 500, suffix: "+", label: "Courses" },
  { value: 250, suffix: "+", label: "Experts" },
  { value: 1000, suffix: "+", label: "Webinars" },
  { value: 50, suffix: "+", label: "Countries" },
];

const STORIES = [
  {
    quote:
      "The first 100 days course gave me a structure I actually followed. My governors noticed the difference by term two.",
    name: "Ritu Sharma",
    role: "Principal, Delhi NCR",
  },
  {
    quote:
      "We wrote our whole-school AI policy in a fortnight using the template and the webinar replay. That would have taken us a year.",
    name: "Nathan Cole",
    role: "Head of School, Auckland",
  },
  {
    quote:
      "The community is the real product. I posted a staffing problem at 9pm and had four workable answers by morning.",
    name: "Amina Yusuf",
    role: "Director, Nairobi",
  },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const duration = 1400;
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - start) / duration, 1);
          setDisplay(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span ref={ref}>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

function Section({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="container-page py-16 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-semibold md:text-3xl">{title}</h2>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && (
          <Button variant="ghost" asChild>
            <Link to={action.to}>
              {action.label} <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-72 rounded-2xl" />
      ))}
    </div>
  );
}

function HomePage() {
  const courses = useQuery(coursesQuery);
  const webinars = useQuery(webinarsQuery);
  const experts = useQuery(expertsQuery);
  const posts = useQuery(postsQuery);

  const upcoming = (webinars.data ?? []).filter((w) => w.status === "upcoming").slice(0, 3);
  const featuredCourses = (courses.data ?? []).slice(0, 6);

  return (
    <PageShell>
      {/* HERO */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" /> {brand.tagline}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] md:text-5xl lg:text-[3.4rem]">
              {brand.headline}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {brand.subheadline}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" variant="brand" asChild>
                <Link to="/courses">Explore learning</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/community">Join the community</Link>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Verifiable certificates", "Live expert webinars", "Peer community"].map((i) => (
                <li key={i} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" /> {i}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)]">
            <img
              src={heroImage}
              alt="School principals and education leaders collaborating around a meeting table"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-b border-border bg-primary py-10 text-primary-foreground">
        <div className="container-page grid grid-cols-2 gap-6 md:grid-cols-5">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-3xl font-semibold">
                <Counter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-primary-foreground/70">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* UPCOMING WEBINARS */}
      <Section
        eyebrow="Live sessions"
        title="Upcoming webinars"
        description="Register free or paid sessions led by practising school leaders and researchers."
        action={{ to: "/webinars", label: "All webinars" }}
      >
        {webinars.isLoading ? (
          <CardGridSkeleton />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((w) => (
              <WebinarCard key={w.id} webinar={w} />
            ))}
          </div>
        )}
      </Section>

      {/* FEATURED COURSES */}
      <div className="bg-surface">
        <Section
          eyebrow="Self-paced learning"
          title="Featured courses"
          description="Practical programmes built for principals, owners and academic leaders."
          action={{ to: "/courses", label: "Browse all courses" }}
        >
          {courses.isLoading ? (
            <CardGridSkeleton count={6} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredCourses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* TRENDING TOPICS */}
      <Section eyebrow="Discover" title="Trending topics">
        <div className="flex flex-wrap gap-2.5">
          {TRENDING.map((t) => (
            <Link
              key={t}
              to="/courses"
              search={{ q: t }}
              className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-accent hover:text-accent"
            >
              {t}
            </Link>
          ))}
        </div>
      </Section>

      {/* EXPERTS */}
      <div className="bg-surface">
        <Section
          eyebrow="Faculty"
          title="Featured experts"
          description="Learn from leaders who have done the job."
          action={{ to: "/experts", label: "Expert directory" }}
        >
          {experts.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(experts.data ?? []).slice(0, 4).map((e) => (
                <ExpertCard key={e.id} expert={e} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* COMMUNITY */}
      <Section
        eyebrow="Community"
        title="What school leaders are discussing"
        action={{ to: "/community", label: "Open community" }}
      >
        {posts.isLoading ? (
          <CardGridSkeleton />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {(posts.data ?? []).slice(0, 3).map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </Section>

      {/* SUCCESS STORIES */}
      <div className="bg-surface">
        <Section eyebrow="Success stories" title="Leaders who grew with AceEdX">
          <div className="grid gap-6 md:grid-cols-3">
            {STORIES.map((s) => (
              <figure key={s.name} className="card-surface p-6">
                <Pill tone="success">Verified member</Pill>
                <blockquote className="mt-4 font-display text-base leading-relaxed">
                  “{s.quote}”
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{s.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      </div>

      {/* CTA */}
      <section className="container-page py-20">
        <div className="rounded-3xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold">
            Your professional home for school leadership
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-primary-foreground/80">
            Join 10,000+ principals, owners and academic leaders learning together — free to start.
          </p>
          <Button size="lg" variant="brand" className="mt-8" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Create your free account
            </Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
