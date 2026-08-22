import { Clapperboard, Mic, Play, Video } from "lucide-react";

const PALETTES = [
  "from-primary via-primary to-accent",
  "from-accent via-accent to-primary",
  "from-success via-success to-primary",
  "from-primary via-accent to-success",
  "from-accent via-primary to-success",
];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function keywords(title: string) {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return words.slice(0, 5).join(" ") || title;
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  if (type === "podcast") return <Mic className={className} />;
  if (type === "reel" || type === "clip") return <Video className={className} />;
  if (type === "recording") return <Play className={className} />;
  return <Clapperboard className={className} />;
}

/**
 * Media preview: uses the real thumbnail when available, otherwise renders an
 * attractive text-based cover built from the video topic.
 */
export function MediaThumb({
  title,
  mediaType = "video",
  thumbnailUrl,
  className = "",
}: {
  title: string;
  mediaType?: string;
  thumbnailUrl?: string | null;
  className?: string;
}) {
  if (thumbnailUrl) {
    return (
      <img
        src={thumbnailUrl}
        alt={title}
        loading="lazy"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  const palette = PALETTES[hash(title) % PALETTES.length];

  return (
    <div
      className={`relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br ${palette} p-4 text-primary-foreground ${className}`}
      aria-label={title}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-foreground/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-primary-foreground/10"
        aria-hidden
      />
      <div className="relative flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-90">
        <TypeIcon type={mediaType} className="h-3.5 w-3.5" />
        {mediaType}
      </div>
      <p className="relative line-clamp-3 font-display text-lg font-semibold leading-snug">
        {keywords(title)}
      </p>
      <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">
        AceEdX PrincipalX
      </p>
    </div>
  );
}
