import { FileText, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MediaLesson = {
  title: string;
  kind: string;
  duration_min: number;
  video_url?: string | null;
  document_url?: string | null;
};

export function toEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.includes("vimeo.com") && !u.hostname.includes("player")) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
    if (u.hostname.includes("drive.google.com")) {
      const match = u.pathname.match(/\/d\/([^/]+)/);
      if (match) return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
    return url;
  } catch {
    return null;
  }
}

export function LessonMedia({ lesson }: { lesson: MediaLesson }) {
  const isDirectVideo = Boolean(lesson.video_url && /\.(mp4|webm|ogg)$/i.test(lesson.video_url));
  const embed = lesson.video_url ? toEmbedUrl(lesson.video_url) : null;

  if (lesson.kind === "video" && lesson.video_url) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-primary">
        {isDirectVideo ? (
          <video className="aspect-video w-full" controls src={lesson.video_url} />
        ) : (
          <iframe
            className="aspect-video w-full"
            src={embed ?? lesson.video_url}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    );
  }

  if (lesson.kind !== "video" && lesson.document_url) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-border">
        <iframe
          className="h-[70vh] w-full bg-surface"
          src={toEmbedUrl(lesson.document_url) ?? lesson.document_url}
          title={lesson.title}
        />
        <div className="flex justify-end border-t border-border bg-card p-3">
          <Button variant="outline" size="sm" asChild>
            <a href={lesson.document_url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-4 w-4" /> Open document
            </a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex aspect-video items-center justify-center rounded-2xl border border-border bg-primary text-primary-foreground">
      <div className="text-center">
        {lesson.kind === "video" ? (
          <PlayCircle className="mx-auto h-14 w-14 opacity-80" />
        ) : (
          <FileText className="mx-auto h-14 w-14 opacity-80" />
        )}
        <p className="mt-3 text-sm opacity-80">
          {lesson.kind === "video"
            ? `${lesson.duration_min} min lesson — video coming soon`
            : `${lesson.duration_min} min reading`}
        </p>
      </div>
    </div>
  );
}
