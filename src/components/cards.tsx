import { Link } from "@tanstack/react-router";
import { Award, Clock, Star, Users, Video, Download, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadResource } from "@/lib/resources";
import { formatPrice } from "@/lib/brand";
import { useAuth } from "@/hooks/useAuth";
import type { Course, Expert, Post, Resource, Webinar } from "@/lib/api";

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    muted: "bg-secondary text-secondary-foreground",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    primary: "bg-primary-soft text-primary",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone] ?? tones.muted}`}
    >
      {children}
    </span>
  );
}

export function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card-surface group flex flex-col overflow-hidden transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex h-28 items-end bg-primary p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary-foreground/80">
          {course.topic}
        </p>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <Pill tone={course.is_free ? "success" : "accent"}>
            {formatPrice(course.price_inr, course.is_free)}
          </Pill>
          <Pill>{course.level}</Pill>
          {course.certificate && (
            <Pill tone="primary">
              <Award className="h-3 w-3" /> Certificate
            </Pill>
          )}
        </div>
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
          <Link to="/courses/$slug" params={{ slug: course.slug }} className="hover:text-accent">
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.summary}</p>
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          {course.experts?.name ?? "AceEdX Faculty"}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-accent" /> {course.rating}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {course.learners.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {course.duration_hours}h
          </span>
        </div>
        <Button className="mt-5 w-full" variant="outline" asChild>
          <Link to="/courses/$slug" params={{ slug: course.slug }}>
            View course
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function WebinarCard({ webinar }: { webinar: Webinar }) {
  const date = new Date(webinar.starts_at);
  return (
    <article className="card-surface flex flex-col p-5 transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={webinar.status === "recorded" ? "muted" : "accent"}>
          {webinar.status === "recorded" ? "Recorded" : "Upcoming"}
        </Pill>
        <Pill tone={webinar.is_free ? "success" : "primary"}>
          {formatPrice(webinar.price_inr, webinar.is_free)}
        </Pill>
        {webinar.certificate && <Pill>Certificate</Pill>}
      </div>
      <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{webinar.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{webinar.description}</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <dt className="font-semibold text-foreground">Date</dt>
          <dd>{date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Time</dt>
          <dd>{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Speaker</dt>
          <dd>{webinar.experts?.name ?? "AceEdX Faculty"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Duration</dt>
          <dd>{webinar.duration_min} min</dd>
        </div>
      </dl>
      <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5" /> {webinar.registered_count.toLocaleString()} registered
      </p>
      <Button className="mt-4 w-full" variant="brand" asChild>
        <Link to="/webinars/$slug" params={{ slug: webinar.slug }}>
          {webinar.status === "recorded" ? (
            <>
              <Video className="h-4 w-4" /> Watch recording
            </>
          ) : (
            "Register"
          )}
        </Link>
      </Button>
    </article>
  );
}

export function ExpertCard({ expert }: { expert: Expert }) {
  const initials = expert.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <article className="card-surface flex flex-col p-5 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-semibold text-primary">
        {initials}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold">{expert.name}</h3>
      <p className="text-xs text-muted-foreground">{expert.title}</p>
      <p className="text-xs font-medium text-foreground">{expert.organisation}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
        {expert.country}
      </p>
      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{expert.bio}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        {expert.expertise.slice(0, 3).map((e) => (
          <Pill key={e}>{e}</Pill>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-4 text-xs text-muted-foreground">
        <span>{expert.courses_count} courses</span>
        <span>{expert.webinars_count} webinars</span>
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 text-accent" />
          {expert.rating}
        </span>
      </div>
    </article>
  );
}

export function ResourceCard({ resource }: { resource: Resource }) {
  const { user } = useAuth();
  return (
    <article className="card-surface flex flex-col p-5">
      <div className="flex flex-wrap gap-2">
        <Pill tone="primary">{resource.resource_type}</Pill>
        <Pill>{resource.category}</Pill>
        {!resource.is_free && <Pill tone="accent">Members</Pill>}
      </div>
      <h3 className="mt-3 font-display text-base font-semibold leading-snug">{resource.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{resource.description}</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {resource.downloads.toLocaleString()} downloads
        </span>
        {user ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              void downloadResource({ fileUrl: resource.file_url, title: resource.title })
            }
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        ) : (
          <Button size="sm" variant="outline" asChild>
            <Link to="/auth" search={{ mode: "signin" }}>
              <Download className="h-4 w-4" /> Sign in to download
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
          {post.author_name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">{post.author_role ?? "AceEdX member"}</p>
          {post.title && (
            <h3 className="mt-3 font-display text-base font-semibold leading-snug">{post.title}</h3>
          )}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {post.body}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {post.topic && <Pill tone="primary">{post.topic}</Pill>}
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" /> {post.reactions} reactions
            </span>
            <span>{post.views.toLocaleString()} views</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export { Pill };
