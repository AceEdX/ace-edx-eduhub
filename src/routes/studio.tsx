import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MessageCircle, Plus, Radio, Trash2, Video } from "lucide-react";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
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
import { useAuth } from "@/hooks/useAuth";
import { INTEREST_AREAS } from "@/lib/brand";
import { useMembership, whatsappConfirmationUrl } from "@/lib/membership";
import { ClipStudio } from "@/components/admin/ClipStudio";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Principal Studio — host webinars & courses | AceEdX" },
      {
        name: "description",
        content:
          "Resource Principals publish webinars, masterclasses and courses, stream over YouTube Live or Zoom, and manage pricing from the Principal Studio.",
      },
      { property: "og:title", content: "Principal Studio — AceEdX" },
      {
        property: "og:description",
        content: "Publish and stream your own webinars, masterclasses and courses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudioPage,
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function toLocalInput(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function StudioPage() {
  const { user, loading } = useAuth();

  const membership = useMembership(user?.id);

  const principal = useQuery({
    queryKey: ["my-principal", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resource_principals")
        .select("id, display_name, status, revenue_share_pct")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (loading || (user && principal.isLoading)) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <div className="container-page py-16">
          <EmptyState
            title="Sign in to open your studio"
            description="The Principal Studio is available to approved Resource Principals."
            action={
              <Button variant="brand" asChild>
                <Link to="/auth" search={{ mode: "signin" }}>
                  Sign in
                </Link>
              </Button>
            }
          />
        </div>
      </PageShell>
    );
  }

  const active = principal.data?.status === "active" || principal.data?.status === "approved";

  if (!active) {
    return (
      <PageShell>
        <PageHeading
          eyebrow="Principal Studio"
          title="Your studio is almost ready"
          description="Once your Resource Principal application is approved and PrincipalX Pro is active, you can publish webinars, masterclasses and courses here."
        />
        <div className="container-page grid gap-4 py-10 sm:grid-cols-2">
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold">1. Apply as a Resource Principal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Share your leadership practice, speaking topics and credentials for review.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link to="/become-a-resource-principal">Go to application</Link>
            </Button>
          </div>
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold">2. Activate PrincipalX Pro</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pro unlocks hosting your own webinars and masterclasses with revenue sharing.
            </p>
            <Button variant="brand" size="sm" className="mt-4" asChild>
              <Link to="/pricing">View plans</Link>
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  const principalId = principal.data!.id;

  return (
    <PageShell>
      <PageHeading
        eyebrow="Principal Studio"
        title={`Welcome, ${principal.data!.display_name}`}
        description={`Publish webinars, masterclasses and courses. You keep ${principal.data!.revenue_share_pct}% of every paid seat.`}
      />
      <div className="container-page py-10">
        <div className="mb-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
          {membership.data && !membership.data.isPro && (
            <div
              className={`rounded-2xl border p-5 ${
                membership.data.trialExpired
                  ? "border-accent bg-accent-soft/50"
                  : "border-border bg-card"
              }`}
            >
              <p className="text-sm font-semibold">
                {membership.data.trialExpired
                  ? "Your free month has ended"
                  : `You are on your free month — ${membership.data.trialDaysLeft} day${membership.data.trialDaysLeft === 1 ? "" : "s"} left`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {membership.data.trialEndsAt
                  ? `Trial ends ${new Date(membership.data.trialEndsAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}. `
                  : ""}
                Upgrade to PrincipalX Pro to keep hosting webinars and masterclasses, and to keep
                earning your revenue share.
              </p>
              <Button variant="brand" size="sm" className="mt-3" asChild>
                <Link to="/pricing">Upgrade to PrincipalX Pro</Link>
              </Button>
            </div>
          )}
          {membership.data?.isPro && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm font-semibold text-success">PrincipalX Pro active</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hosting, revenue sharing and the remix studio are all unlocked.
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Need a hand going live?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Message the PrincipalX team on WhatsApp and we will set up your first session with you.
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a
                href={whatsappConfirmationUrl(
                  `Hello PrincipalX team, this is ${principal.data!.display_name}. I am approved as a Resource Principal and would like help launching my first webinar.`,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp support
              </a>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="webinars">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="webinars">Webinars & masterclasses</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="remix">Reels & posts</TabsTrigger>
          </TabsList>
          <TabsContent value="webinars">
            <StudioWebinars principalId={principalId} />
          </TabsContent>
          <TabsContent value="courses">
            <StudioCourses principalId={principalId} />
          </TabsContent>
          <TabsContent value="remix">
            <ClipStudio />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  );
}

/* --------------------------------- Webinars -------------------------------- */

const STREAM_PROVIDERS = [
  { value: "youtube", label: "YouTube (recorded)" },
  { value: "youtube_live", label: "YouTube Live" },
  { value: "zoom", label: "Zoom" },
  { value: "direct", label: "Direct link / other" },
];

function StudioWebinars({ principalId }: { principalId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<string>(INTEREST_AREAS[0] ?? "Leadership");
  const [programType, setProgramType] = useState("webinar");

  const list = useQuery({
    queryKey: ["studio-webinars", principalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webinars")
        .select(
          "id, slug, title, description, starts_at, duration_min, price_inr, is_free, published, status, stream_provider, meeting_url, recording_url, program_type",
        )
        .eq("principal_id", principalId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function create() {
    if (title.trim().length < 6) {
      toast.error("Give your session a clear title");
      return;
    }
    setBusy(true);
    const starts = new Date(Date.now() + 7 * 86400000);
    starts.setMinutes(0, 0, 0);
    const { error } = await supabase.from("webinars").insert({
      principal_id: principalId,
      slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      topic,
      program_type: programType,
      starts_at: starts.toISOString(),
      status: "upcoming",
      stream_provider: "youtube_live",
      published: false,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    toast.success("Draft created — add the details and publish when ready");
    qc.invalidateQueries({ queryKey: ["studio-webinars", principalId] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface grid gap-4 p-5 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <div>
          <Label className="text-xs">New session title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leading teacher retention in 2026"
          />
        </div>
        <div>
          <Label className="text-xs">Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTEREST_AREAS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={programType} onValueChange={setProgramType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="webinar">Webinar</SelectItem>
              <SelectItem value="masterclass">Masterclass</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="brand" disabled={busy} onClick={create}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
        </Button>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : !list.data?.length ? (
        <EmptyState
          title="No sessions yet"
          description="Create your first webinar or masterclass above."
        />
      ) : (
        list.data.map((w) => (
          <StudioWebinarEditor
            key={w.id}
            webinar={w}
            onChanged={() => qc.invalidateQueries({ queryKey: ["studio-webinars", principalId] })}
          />
        ))
      )}
    </div>
  );
}

type StudioWebinar = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  starts_at: string;
  duration_min: number;
  price_inr: number;
  is_free: boolean;
  published: boolean;
  status: string;
  stream_provider: string;
  meeting_url: string | null;
  recording_url: string | null;
  program_type: string;
};

function StudioWebinarEditor({
  webinar,
  onChanged,
}: {
  webinar: StudioWebinar;
  onChanged: () => void;
}) {
  const [row, setRow] = useState(webinar);

  async function patch(values: Partial<StudioWebinar>) {
    const next = { ...row, ...values };
    setRow(next);
    const { error } = await supabase
      .from("webinars")
      .update({
        title: next.title,
        description: next.description,
        starts_at: next.starts_at,
        duration_min: next.duration_min,
        price_inr: next.price_inr,
        is_free: next.is_free,
        published: next.published,
        status: next.status,
        stream_provider: next.stream_provider,
        meeting_url: next.meeting_url,
        recording_url: next.recording_url,
      })
      .eq("id", webinar.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("webinars").delete().eq("id", webinar.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Session deleted");
    onChanged();
  }

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Input
            value={row.title}
            onChange={(e) => setRow({ ...row, title: e.target.value })}
            onBlur={() => patch({ title: row.title })}
            className="font-display text-base font-semibold"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            {row.program_type} · {new Date(row.starts_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={row.published} onCheckedChange={(v) => patch({ published: v })} />
            <span className={row.published ? "text-success" : "text-muted-foreground"}>
              {row.published ? "Visible" : "Hidden"}
            </span>
          </label>
          <Button variant="ghost" size="sm" onClick={() => void remove()}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <Label className="text-xs">Description</Label>
          <Textarea
            rows={3}
            value={row.description ?? ""}
            onChange={(e) => setRow({ ...row, description: e.target.value })}
            onBlur={() => patch({ description: row.description })}
          />
        </div>
        <div>
          <Label className="text-xs">Date &amp; time</Label>
          <Input
            type="datetime-local"
            value={toLocalInput(row.starts_at)}
            onChange={(e) => setRow({ ...row, starts_at: new Date(e.target.value).toISOString() })}
            onBlur={() => patch({ starts_at: row.starts_at })}
          />
        </div>
        <div>
          <Label className="text-xs">Duration (minutes)</Label>
          <Input
            type="number"
            min={5}
            value={row.duration_min}
            onChange={(e) => setRow({ ...row, duration_min: Number(e.target.value) })}
            onBlur={() => patch({ duration_min: row.duration_min })}
          />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={row.status} onValueChange={(v) => patch({ status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="recorded">Recorded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Price (₹)</Label>
          <Input
            type="number"
            min={0}
            value={row.price_inr}
            onChange={(e) => setRow({ ...row, price_inr: Number(e.target.value) })}
            onBlur={() => patch({ price_inr: row.price_inr })}
          />
        </div>
        <div>
          <Label className="text-xs">Free session</Label>
          <div className="flex h-10 items-center">
            <Switch checked={row.is_free} onCheckedChange={(v) => patch({ is_free: v })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Streaming platform</Label>
          <Select value={row.stream_provider} onValueChange={(v) => patch({ stream_provider: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STREAM_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">
              Live link (YouTube Live or Zoom join URL)
            </Label>
            <Input
              value={row.meeting_url ?? ""}
              placeholder="https://youtube.com/live/… or https://zoom.us/j/…"
              onChange={(e) => setRow({ ...row, meeting_url: e.target.value })}
              onBlur={() => patch({ meeting_url: row.meeting_url })}
            />
          </div>
          <div>
            <Label className="text-xs">Recording link</Label>
            <Input
              value={row.recording_url ?? ""}
              placeholder="https://youtube.com/watch?v=…"
              onChange={(e) => setRow({ ...row, recording_url: e.target.value })}
              onBlur={() => patch({ recording_url: row.recording_url })}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="brand"
          size="sm"
          disabled={!row.meeting_url}
          onClick={() => {
            if (!row.meeting_url) return;
            void patch({ status: "live", published: true });
            window.open(row.meeting_url, "_blank", "noopener");
          }}
        >
          <Radio className="h-4 w-4" /> Go live now
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://studio.youtube.com/channel/UC/livestreaming"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open YouTube Live
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href="https://zoom.us/meeting/schedule" target="_blank" rel="noopener noreferrer">
            Schedule on Zoom
          </a>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/webinars/$slug" params={{ slug: row.slug }}>
            <Video className="h-4 w-4" /> View page
          </Link>
        </Button>
      </div>
      {!row.meeting_url && (
        <p className="mt-2 text-xs text-muted-foreground">
          Paste your Zoom, YouTube Live or other join link above to enable the go live button.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- Courses --------------------------------- */

type StudioCourse = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  price_inr: number;
  is_free: boolean;
  published: boolean;
  format: string;
  duration_hours: number;
};

function StudioCourses({ principalId }: { principalId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState<string>(INTEREST_AREAS[0] ?? "Leadership");
  const [busy, setBusy] = useState(false);

  const list = useQuery({
    queryKey: ["studio-courses", principalId],
    queryFn: async (): Promise<StudioCourse[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, summary, price_inr, is_free, published, format, duration_hours")
        .eq("principal_id", principalId)
        .order("title");
      if (error) throw error;
      return (data ?? []) as StudioCourse[];
    },
  });

  async function create() {
    if (title.trim().length < 6) {
      toast.error("Give your course a clear title");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("courses").insert({
      principal_id: principalId,
      slug: `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      topic,
      level: "Foundational",
      format: "video",
      published: false,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    toast.success("Course draft created");
    qc.invalidateQueries({ queryKey: ["studio-courses", principalId] });
  }

  async function patch(course: StudioCourse, values: Partial<StudioCourse>) {
    const { error } = await supabase.from("courses").update(values).eq("id", course.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["studio-courses", principalId] });
  }

  async function remove(course: StudioCourse) {
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Course deleted");
    qc.invalidateQueries({ queryKey: ["studio-courses", principalId] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface grid gap-4 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <div>
          <Label className="text-xs">New course title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Building a culture of feedback"
          />
        </div>
        <div>
          <Label className="text-xs">Topic</Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTEREST_AREAS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="brand" disabled={busy} onClick={create}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
        </Button>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : !list.data?.length ? (
        <EmptyState title="No courses yet" description="Create your first course above." />
      ) : (
        list.data.map((c) => (
          <div key={c.id} className="card-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h3 className="font-display text-lg font-semibold">{c.title}</h3>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={c.published}
                    onCheckedChange={(v) => void patch(c, { published: v })}
                  />
                  <span className={c.published ? "text-success" : "text-muted-foreground"}>
                    {c.published ? "Visible" : "Hidden"}
                  </span>
                </label>
                <Button variant="ghost" size="sm" onClick={() => void remove(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Price (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  defaultValue={c.price_inr}
                  onBlur={(e) => void patch(c, { price_inr: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Free course</Label>
                <div className="flex h-10 items-center">
                  <Switch
                    checked={c.is_free}
                    onCheckedChange={(v) => void patch(c, { is_free: v })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Format</Label>
                <Select value={c.format} onValueChange={(v) => void patch(c, { format: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video course</SelectItem>
                    <SelectItem value="document">Document / reading course</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Label className="text-xs">Summary</Label>
                <Textarea
                  rows={2}
                  defaultValue={c.summary ?? ""}
                  onBlur={(e) => void patch(c, { summary: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link to="/courses/$slug" params={{ slug: c.slug }}>
                  View page
                </Link>
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
