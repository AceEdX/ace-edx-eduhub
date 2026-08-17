import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clapperboard, Play } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pill } from "@/components/cards";
import { toEmbedUrl } from "@/components/LessonMedia";
import { supabase } from "@/integrations/supabase/client";

type MediaAsset = {
  id: string;
  title: string;
  description: string | null;
  media_type: string;
  url: string;
  thumbnail_url: string | null;
  duration_sec: number;
  tags: string[];
  views: number;
};

const mediaQuery = {
  queryKey: ["media-assets"],
  queryFn: async (): Promise<MediaAsset[]> => {
    const { data, error } = await supabase
      .from("media_assets")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as MediaAsset[];
  },
};

const FILTERS = ["All", "video", "reel", "podcast", "clip"] as const;

export const Route = createFileRoute("/media/")({
  head: () => ({
    meta: [
      { title: "Media library — talks, reels and replays for school leaders" },
      {
        name: "description",
        content:
          "Watch keynote talks, masterclass clips, leadership reels and podcast episodes recorded with practising principals across India.",
      },
      { property: "og:title", content: "Media library for school leaders — AceEdX" },
      {
        property: "og:description",
        content: "Talks, reels, clips and podcast episodes from practising school leaders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MediaPage,
});

function formatDuration(sec: number) {
  if (!sec) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function MediaPage() {
  const list = useQuery(mediaQuery);
  const [filter, setFilter] = useState<string>("All");
  const [term, setTerm] = useState("");
  const [playing, setPlaying] = useState<MediaAsset | null>(null);

  const items = useMemo(() => {
    const q = term.trim().toLowerCase();
    return (list.data ?? []).filter((m) => {
      if (filter !== "All" && m.media_type !== filter) return false;
      if (!q) return true;
      return [m.title, m.description, ...(m.tags ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list.data, filter, term]);

  return (
    <PageShell>
      <PageHeading
        eyebrow="Media"
        title="Video library, reels and replays"
        description="Short, practical media from practising principals — keynote talks, masterclass clips, leadership reels and podcast conversations you can watch between periods."
      />
      <div className="container-page py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search talks, reels and topics"
            aria-label="Search media"
            className="h-11 max-w-md rounded-full"
          />
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                  filter === f
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {list.isLoading ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="No media published yet"
              description="New talks, reels and replays are published here after every masterclass and live session."
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((m) => (
              <article key={m.id} className="card-surface overflow-hidden">
                <button
                  onClick={() => setPlaying(m)}
                  className="group relative block aspect-video w-full bg-primary"
                  aria-label={`Play ${m.title}`}
                >
                  {m.thumbnail_url ? (
                    <img
                      src={m.thumbnail_url}
                      alt={m.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Clapperboard className="absolute inset-0 m-auto h-12 w-12 text-primary-foreground opacity-70" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-primary/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-10 w-10 text-primary-foreground" />
                  </span>
                </button>
                <div className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{m.media_type}</Pill>
                    {m.duration_sec > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(m.duration_sec)}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 font-display text-base font-semibold">{m.title}</h2>
                  {m.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {m.description}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setPlaying(m)}
                  >
                    <Play className="h-4 w-4" /> Watch
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(playing)} onOpenChange={(o) => !o && setPlaying(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{playing?.title}</DialogTitle>
          </DialogHeader>
          {playing && (
            <div className="overflow-hidden rounded-xl border border-border bg-primary">
              {/\.(mp4|webm|ogg)$/i.test(playing.url) ? (
                <video className="aspect-video w-full" controls src={playing.url} />
              ) : (
                <iframe
                  className="aspect-video w-full"
                  src={toEmbedUrl(playing.url) ?? playing.url}
                  title={playing.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          )}
          {playing?.description && (
            <p className="text-sm text-muted-foreground">{playing.description}</p>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
