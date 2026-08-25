import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Linkedin, Send, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { publishLinkedInPost } from "@/lib/social.functions";
import { repurposeContent } from "@/lib/ai.functions";

const CHANNELS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "x", label: "X (Twitter)" },
];

type Publication = {
  id: string;
  channel: string;
  caption: string;
  link_url: string | null;
  status: string;
  published_url: string | null;
  error: string | null;
  created_at: string;
};

/**
 * Composer + queue for social posts. Resource Principals see only their own
 * posts (`ownerOnly`); admins see everything.
 */
export function SocialPostsPanel({ ownerOnly = false }: { ownerOnly?: boolean }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [channel, setChannel] = useState("linkedin");
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [source, setSource] = useState("");
  const [writing, setWriting] = useState(false);
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["social-publications", ownerOnly ? (user?.id ?? "anon") : "all"],
    enabled: !ownerOnly || Boolean(user),
    queryFn: async (): Promise<Publication[]> => {
      let q = supabase
        .from("social_publications")
        .select("id, channel, caption, link_url, status, published_url, error, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (ownerOnly && user) q = q.eq("created_by", user.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Publication[];
    },
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["social-publications"] });
    qc.invalidateQueries({ queryKey: ["admin-publications"] });
  };

  async function writeWithAi() {
    if (source.trim().length < 30) {
      toast.error("Paste a few lines about the session first");
      return;
    }
    setWriting(true);
    try {
      const label = CHANNELS.find((c) => c.value === channel)?.label ?? "LinkedIn";
      const res = await repurposeContent({ data: { source: source.trim(), channels: [label] } });
      setCaption(res.output.replace(new RegExp(`^${label}:?\\s*`, "i"), "").trim());
      toast.success("Draft ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not write the post");
    } finally {
      setWriting(false);
    }
  }

  async function publish() {
    if (caption.trim().length < 5) {
      toast.error("Write a caption first");
      return;
    }
    setBusy(true);
    try {
      if (channel === "linkedin") {
        const res = await publishLinkedInPost({
          data: {
            text: caption.trim(),
            ...(linkUrl.trim() ? { linkUrl: linkUrl.trim() } : {}),
          },
        });
        toast.success("Published to LinkedIn");
        window.open(res.publishedUrl, "_blank", "noopener");
      } else {
        const { error } = await supabase.from("social_publications").insert({
          channel,
          caption: caption.trim(),
          link_url: linkUrl.trim() || null,
          status: "scheduled",
          created_by: user?.id ?? null,
        });
        if (error) throw error;
        toast.success("Queued — copy the caption when you post it");
      }
      setCaption("");
      setLinkUrl("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not publish the post");
    } finally {
      setBusy(false);
    }
  }

  async function retry(row: Publication) {
    setBusy(true);
    try {
      const res = await publishLinkedInPost({
        data: {
          text: row.caption,
          ...(row.link_url ? { linkUrl: row.link_url } : {}),
          publicationId: row.id,
        },
      });
      toast.success("Published to LinkedIn");
      window.open(res.publishedUrl, "_blank", "noopener");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "LinkedIn publishing failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const { error } = await supabase.from("social_publications").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Post to your social handles</h3>
        <p className="text-sm text-muted-foreground">
          Paste anything about your session, let AI write the post, then publish to LinkedIn
          instantly or queue it for Instagram, YouTube, Facebook and X.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Link to include (optional)</Label>
            <Input
              value={linkUrl}
              placeholder="https://eduhub.aceedx.com/webinars/…"
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">What is the session about?</Label>
            <Textarea
              rows={3}
              value={source}
              placeholder="Paste the webinar description, transcript or key takeaways."
              onChange={(e) => setSource(e.target.value)}
            />
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => void writeWithAi()}
              disabled={writing}
            >
              {writing ? "Writing…" : "Write with AI"}
            </Button>
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">Post caption</Label>
            <Textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="brand" onClick={() => void publish()} disabled={busy}>
            {channel === "linkedin" ? (
              <Linkedin className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}{" "}
            {channel === "linkedin" ? "Publish to LinkedIn" : "Queue post"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(caption);
              toast.success("Caption copied");
            }}
            disabled={!caption.trim()}
          >
            <Copy className="h-4 w-4" /> Copy caption
          </Button>
        </div>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : !list.data?.length ? (
        <EmptyState
          title="No posts yet"
          description="Your published and queued posts will appear here."
        />
      ) : (
        <div className="card-surface divide-y divide-border">
          {list.data.map((row) => (
            <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {row.channel} · {row.status} ·{" "}
                  {new Date(row.created_at).toLocaleDateString()}
                </p>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm">{row.caption}</p>
                {row.error && <p className="mt-1 text-xs text-destructive">{row.error}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(row.caption);
                    toast.success("Caption copied");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {row.published_url ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={row.published_url} target="_blank" rel="noopener noreferrer">
                      View
                    </a>
                  </Button>
                ) : (
                  row.channel === "linkedin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => void retry(row)}
                    >
                      <Linkedin className="h-4 w-4" /> Publish
                    </Button>
                  )
                )}
                <Button variant="ghost" size="sm" onClick={() => void remove(row.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
