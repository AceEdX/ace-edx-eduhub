import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function SponsorshipsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-sponsorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsorships")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("sponsorships").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-sponsorships"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-2xl" />;
  if (!data?.length)
    return (
      <EmptyState
        title="No sponsorship enquiries"
        description="Brand partnership enquiries will land here."
      />
    );

  return (
    <div className="space-y-3">
      {data.map((s) => (
        <div key={s.id} className="card-surface space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{s.company_name}</p>
              <p className="text-xs text-muted-foreground">
                {s.contact_name} · {s.contact_email}
                {s.phone ? ` · ${s.phone}` : ""} · {s.package_type}
                {s.budget_inr ? ` · ₹${s.budget_inr.toLocaleString("en-IN")}` : ""}
              </p>
            </div>
            <Select value={s.status} onValueChange={(v) => setStatus(s.id, v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_discussion">In discussion</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {s.message && <p className="text-sm text-muted-foreground">{s.message}</p>}
        </div>
      ))}
    </div>
  );
}

export function SpeakerRequestsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-speaker-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("speaker_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("speaker_requests").update({ status }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-speaker-requests"] });
  }

  if (isLoading) return <Skeleton className="h-48 rounded-2xl" />;
  if (!data?.length)
    return (
      <EmptyState
        title="No speaker requests"
        description="Invitations to Resource Principals will appear here."
      />
    );

  return (
    <div className="space-y-3">
      {data.map((r) => (
        <div key={r.id} className="card-surface space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{r.event_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.topic} · {r.event_format}
                {r.city ? ` · ${r.city}` : ""}
                {r.event_date ? ` · ${new Date(r.event_date).toLocaleDateString()}` : ""}
                {r.budget_inr ? ` · ₹${r.budget_inr.toLocaleString("en-IN")}` : ""}
              </p>
            </div>
            <Select value={r.status} onValueChange={(v) => setStatus(r.id, v)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {r.message && <p className="text-sm text-muted-foreground">{r.message}</p>}
        </div>
      ))}
    </div>
  );
}

export function LearningPathsAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [pathId, setPathId] = useState("");
  const [courseId, setCourseId] = useState("");

  const paths = useQuery({
    queryKey: ["admin-paths"],
    queryFn: async () => {
      const { data, error } = await supabase.from("learning_paths").select("*").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = useQuery({
    queryKey: ["admin-path-items", pathId],
    enabled: Boolean(pathId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_path_items")
        .select("*")
        .eq("path_id", pathId)
        .order("step_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const courses = useQuery({
    queryKey: ["admin-courses-basic"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function createPath() {
    if (title.trim().length < 3) {
      toast.error("Give the path a title");
      return;
    }
    const { error } = await supabase.from("learning_paths").insert({
      title: title.trim(),
      slug: slugify(title),
      summary: summary.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Learning path created");
    setTitle("");
    setSummary("");
    qc.invalidateQueries({ queryKey: ["admin-paths"] });
    qc.invalidateQueries({ queryKey: ["learning-paths"] });
  }

  async function addStep() {
    if (!pathId || !courseId) {
      toast.error("Pick a path and a course");
      return;
    }
    const next = (items.data?.length ?? 0) + 1;
    const { error } = await supabase.from("learning_path_items").insert({
      path_id: pathId,
      course_id: courseId,
      item_type: "course",
      step_order: next,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Step added");
    qc.invalidateQueries({ queryKey: ["admin-path-items", pathId] });
    qc.invalidateQueries({ queryKey: ["learning-paths"] });
  }

  async function removeStep(id: string) {
    const { error } = await supabase.from("learning_path_items").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["admin-path-items", pathId] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Create a learning path</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Summary</Label>
            <Textarea rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={createPath}>
          <Plus className="h-4 w-4" /> Create path
        </Button>
      </div>

      <div className="card-surface space-y-4 p-5">
        <h3 className="font-display text-lg font-semibold">Add steps</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Path</Label>
            <Select value={pathId} onValueChange={setPathId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a path" />
              </SelectTrigger>
              <SelectContent>
                {(paths.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Course</Label>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a course" />
              </SelectTrigger>
              <SelectContent>
                {(courses.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="brand" size="sm" onClick={addStep}>
          <Plus className="h-4 w-4" /> Add step
        </Button>

        {pathId && (items.data?.length ?? 0) > 0 && (
          <ul className="space-y-2 pt-2">
            {(items.data ?? []).map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between border-t border-border pt-2 text-sm"
              >
                <span>
                  Step {i.step_order} ·{" "}
                  {(courses.data ?? []).find((c) => c.id === i.course_id)?.title ?? i.item_type}
                </span>
                <Button variant="ghost" size="sm" onClick={() => removeStep(i.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function AnalyticsAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const counts = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("enrollments").select("id", { count: "exact", head: true }),
        supabase.from("webinar_registrations").select("id", { count: "exact", head: true }),
        supabase.from("certificates").select("id", { count: "exact", head: true }),
        supabase.from("community_posts").select("id", { count: "exact", head: true }),
        supabase.from("resource_principals").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
      ]);
      const { data: orders } = await supabase
        .from("orders")
        .select("amount_inr, status, item_type, created_at")
        .eq("status", "paid");
      const paid = orders ?? [];
      const revenue = paid.reduce((sum, o) => sum + (o.amount_inr ?? 0), 0);
      const thisMonth = paid
        .filter((o) => new Date(o.created_at).getMonth() === new Date().getMonth())
        .reduce((sum, o) => sum + (o.amount_inr ?? 0), 0);
      return {
        members: counts[0].count ?? 0,
        enrollments: counts[1].count ?? 0,
        registrations: counts[2].count ?? 0,
        certificates: counts[3].count ?? 0,
        posts: counts[4].count ?? 0,
        principals: counts[5].count ?? 0,
        subscriptions: counts[6].count ?? 0,
        revenue,
        thisMonth,
        orders: paid.length,
      };
    },
  });

  if (isLoading || !data) return <Skeleton className="h-48 rounded-2xl" />;

  const tiles = [
    { label: "Members", value: data.members.toLocaleString("en-IN") },
    { label: "Course enrolments", value: data.enrollments.toLocaleString("en-IN") },
    { label: "Webinar registrations", value: data.registrations.toLocaleString("en-IN") },
    { label: "Certificates issued", value: data.certificates.toLocaleString("en-IN") },
    { label: "Community posts", value: data.posts.toLocaleString("en-IN") },
    { label: "Resource Principals", value: data.principals.toLocaleString("en-IN") },
    { label: "Active subscriptions", value: data.subscriptions.toLocaleString("en-IN") },
    { label: "Paid orders", value: data.orders.toLocaleString("en-IN") },
    { label: "Lifetime revenue", value: `₹${data.revenue.toLocaleString("en-IN")}` },
    { label: "Revenue this month", value: `₹${data.thisMonth.toLocaleString("en-IN")}` },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => (
        <div key={t.label} className="card-surface p-5">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
          <p className="mt-2 font-display text-2xl font-semibold">{t.value}</p>
        </div>
      ))}
    </div>
  );
}

export function GrowthAdmin() {
  return (
    <Tabs defaultValue="analytics">
      <TabsList className="mb-5 flex-wrap">
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="sponsorships">Sponsorships</TabsTrigger>
        <TabsTrigger value="speakers">Speaker requests</TabsTrigger>
        <TabsTrigger value="paths">Learning paths</TabsTrigger>
      </TabsList>
      <TabsContent value="analytics">
        <AnalyticsAdmin />
      </TabsContent>
      <TabsContent value="sponsorships">
        <SponsorshipsAdmin />
      </TabsContent>
      <TabsContent value="speakers">
        <SpeakerRequestsAdmin />
      </TabsContent>
      <TabsContent value="paths">
        <LearningPathsAdmin />
      </TabsContent>
    </Tabs>
  );
}
