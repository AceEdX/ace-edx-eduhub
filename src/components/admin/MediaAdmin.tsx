import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Send, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

const MEDIA_TYPES = ["video", "reel", "recording", "podcast"];
const CHANNELS = ["linkedin", "instagram", "facebook", "youtube"];

export function MediaLibraryAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState("video");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function add() {
    if (!title.trim() || !url.trim()) {
      toast.error("Title and link are required");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("media_assets").insert({
      title: title.trim(),
      url: url.trim(),
      description: description.trim() || null,
      media_type: mediaType,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Added to the video library");
    setTitle("");
    setUrl("");
    setDescription("");
    qc.invalidateQueries({ queryKey: ["admin-media"] });
    qc.invalidateQueries({ queryKey: ["media-library"] });
  }

  async function update(id: string, values: { published?: boolean }) {
    const { error } = await supabase.from("media_assets").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-media"] });
    qc.invalidateQueries({ queryKey: ["media-library"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("media_assets").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Removed");
    qc.invalidateQueries({ queryKey: ["admin-media"] });
    qc.invalidateQueries({ queryKey: ["media-library"] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Add to the video library</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Link (YouTube, Vimeo or MP4)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <Select value={mediaType} onValueChange={setMediaType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEDIA_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={add} disabled={busy}>
          <Plus className="h-4 w-4" /> {busy ? "Adding…" : "Add media"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : !data?.length ? (
        <EmptyState title="No media yet" description="Videos and reels you add will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((m) => (
            <div key={m.id} className="card-surface flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{m.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {m.media_type} · {m.url}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <Switch
                  checked={m.published}
                  onCheckedChange={(v) => update(m.id, { published: v })}
                />
                {m.published ? "Visible" : "Hidden"}
              </label>
              <Button variant="outline" size="sm" onClick={() => remove(m.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SocialPublishingAdmin() {
  const qc = useQueryClient();
  const [channel, setChannel] = useState("linkedin");
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-publications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_publications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function schedule() {
    if (caption.trim().length < 5) {
      toast.error("Write a caption first");
      return;
    }
    const { error } = await supabase.from("social_publications").insert({
      channel,
      caption: caption.trim(),
      link_url: linkUrl.trim() || null,
      scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      status: scheduledFor ? "scheduled" : "draft",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Queued for publishing");
    setCaption("");
    setLinkUrl("");
    setScheduledFor("");
    qc.invalidateQueries({ queryKey: ["admin-publications"] });
  }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("social_publications").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-publications"] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Publishing queue</h3>
        <p className="text-sm text-muted-foreground">
          Draft and schedule posts for LinkedIn, Instagram, Facebook and YouTube. Copy the caption
          when it is due and mark it published — direct channel posting needs each network&apos;s
          business account to be connected.
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
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Link</Label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Schedule for</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Label className="text-xs">Caption</Label>
            <Textarea rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={schedule}>
          <Send className="h-4 w-4" /> Queue post
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : !data?.length ? (
        <EmptyState title="Nothing queued" description="Scheduled social posts will appear here." />
      ) : (
        <div className="space-y-3">
          {data.map((p) => (
            <div key={p.id} className="card-surface space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {p.channel} · {p.status}
                  {p.scheduled_for ? ` · ${new Date(p.scheduled_for).toLocaleString()}` : ""}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(p.caption);
                      toast.success("Caption copied");
                    }}
                  >
                    Copy
                  </Button>
                  {p.status !== "published" && (
                    <Button variant="brand" size="sm" onClick={() => setStatus(p.id, "published")}>
                      Mark published
                    </Button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-sm">{p.caption}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaAdmin() {
  return (
    <Tabs defaultValue="library">
      <TabsList className="mb-5">
        <TabsTrigger value="library">Video library</TabsTrigger>
        <TabsTrigger value="publishing">Social publishing</TabsTrigger>
      </TabsList>
      <TabsContent value="library">
        <MediaLibraryAdmin />
      </TabsContent>
      <TabsContent value="publishing">
        <SocialPublishingAdmin />
      </TabsContent>
    </Tabs>
  );
}
