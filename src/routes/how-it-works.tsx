import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeading, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import demoVideo from "@/assets/aceedx-demo.mp4.asset.json";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How AceEdX works — watch the 1-minute demo" },
      {
        name: "description",
        content:
          "Watch a short guided tour of AceEdX: browse courses and webinars, meet Resource Principals, join the community and earn verifiable certificates.",
      },
      { property: "og:title", content: "How AceEdX works — watch the demo" },
      {
        property: "og:description",
        content: "A one-minute tour of courses, live webinars, the community and certificates on AceEdX.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    title: "Browse before you join",
    body: "Every course, webinar and Resource Principal profile is visible without an account. Sign in only when you enrol or download.",
  },
  {
    title: "Learn at your own pace",
    body: "Video lessons, readings and templates with progress tracking, so you can pick up exactly where you left off.",
  },
  {
    title: "Attend live sessions",
    body: "Register in one click for free or paid webinars on Zoom or YouTube Live, and watch the replay any time afterwards.",
  },
  {
    title: "Meet Resource Principals",
    body: "Verified practising school leaders who teach masterclasses, host webinars and mentor. Any signed-in member can browse the full directory.",
  },
  {
    title: "Ask the community",
    body: "Post a real problem and get answers from principals who have solved it, plus official NEP, NCF and SMC resources to download.",
  },
  {
    title: "Earn certificates",
    body: "Complete a course or watch a session end to end and download a verifiable certificate you can share.",
  },
];

function HowItWorksPage() {
  return (
    <PageShell>
      <PageHeading
        eyebrow="Getting started"
        title="How AceEdX works"
        description="A one-minute guided tour of the platform — no account needed to watch."
      />
      <div className="container-page py-10">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-lift)]">
          <video
            src={demoVideo.url}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-primary"
          >
            <track kind="captions" />
          </video>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <article key={s.title} className="card-surface p-6">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Step {i + 1}
              </span>
              <h2 className="mt-2 font-display text-lg font-semibold">{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button size="lg" variant="brand" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>
              Create your free account
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="/resource-principals">Browse Resource Principals</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
