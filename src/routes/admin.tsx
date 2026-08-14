import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2 } from "lucide-react";
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
import { useAdmin } from "@/hooks/useAdmin";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — AceEdX" },
      {
        name: "description",
        content: "Manage AceEdX courses, webinars, lesson content, pricing and orders.",
      },
      { property: "og:title", content: "Admin console — AceEdX" },
      { property: "og:description", content: "Manage courses, webinars, content and pricing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  topic: string;
  level: string;
  price_inr: number;
  is_free: boolean;
  published: boolean;
  format: string;
  duration_hours: number;
};

type WebinarRow = {
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
  meeting_url: string | null;
  recording_url: string | null;
};

type LessonRow = {
  id: string;
  course_id: string;
  module_title: string;
  module_order: number;
  title: string;
  lesson_order: number;
  kind: string;
  duration_min: number;
  content: string | null;
  video_url: string | null;
  document_url: string | null;
};

function AdminPage() {
  const { isAdmin, checking } = useAdmin();

  if (checking) {
    return (
      <PageShell>
        <div className="container-page space-y-4 py-16">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </PageShell>
    );
  }

  if (!isAdmin) {
    return (
      <PageShell>
        <div className="container-page py-20">
          <EmptyState
            title="Admin access required"
            description="Sign in with your AceEdX admin account to manage courses, webinars and content."
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

  return (
    <PageShell>
      <PageHeading
        eyebrow="Admin"
        title="AceEdX admin console"
        description="Publish or hide any course and webinar, set pricing, choose the course format, and upload lesson videos or reading material."
      />
      <div className="container-page py-10">
        <Tabs defaultValue="courses">
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="courses">Courses</TabsTrigger>
            <TabsTrigger value="webinars">Webinars</TabsTrigger>
            <TabsTrigger value="content">Course content</TabsTrigger>
            <TabsTrigger value="verifications">Verifications</TabsTrigger>
            <TabsTrigger value="principals">Resource Principals</TabsTrigger>
            <TabsTrigger value="moderation">Community</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="courses">
            <CoursesAdmin />
          </TabsContent>
          <TabsContent value="webinars">
            <WebinarsAdmin />
          </TabsContent>
          <TabsContent value="content">
            <ContentAdmin />
          </TabsContent>
          <TabsContent value="verifications">
            <VerificationQueueAdmin />
          </TabsContent>
          <TabsContent value="principals">
            <ResourcePrincipalsAdmin />
          </TabsContent>
          <TabsContent value="moderation">
            <ModerationAdmin />
          </TabsContent>
          <TabsContent value="library">
            <ResourcesAdmin />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersAdmin />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsAdmin />
          </TabsContent>

        </Tabs>
      </div>
    </PageShell>
  );
}

/* ---------------------------------- Courses --------------------------------- */

function CoursesAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async (): Promise<CourseRow[]> => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, slug, title, summary, topic, level, price_inr, is_free, published, format, duration_hours")
        .order("title");
      if (error) throw error;
      return (data ?? []) as CourseRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!data?.length)
    return <EmptyState title="No courses yet" description="Courses you create will appear here." />;

  return (
    <div className="space-y-4">
      {data.map((course) => (
        <CourseEditor
          key={course.id}
          course={course}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-courses"] });
            qc.invalidateQueries({ queryKey: ["courses"] });
          }}
        />
      ))}
    </div>
  );
}

function CourseEditor({ course, onSaved }: { course: CourseRow; onSaved: () => void }) {
  const [row, setRow] = useState(course);
  const [saving, setSaving] = useState(false);
  useEffect(() => setRow(course), [course]);

  async function patch(values: Partial<CourseRow>) {
    setSaving(true);
    const next = { ...row, ...values };
    setRow(next);
    const { error } = await supabase
      .from("courses")
      .update({
        published: next.published,
        price_inr: next.price_inr,
        is_free: next.is_free,
        format: next.format,
      })
      .eq("id", course.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${course.title} updated`);
    onSaved();
  }

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{row.title}</h3>
          <p className="text-xs text-muted-foreground">
            {row.topic} · {row.level} · {row.duration_hours}h
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={row.published}
            onCheckedChange={(v) => patch({ published: v })}
            aria-label={`Toggle visibility for ${row.title}`}
          />
          <span className={row.published ? "text-success" : "text-muted-foreground"}>
            {row.published ? "Visible" : "Hidden"}
          </span>
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
          <Label className="text-xs">Free course</Label>
          <div className="flex h-10 items-center">
            <Switch checked={row.is_free} onCheckedChange={(v) => patch({ is_free: v })} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Format</Label>
          <Select value={row.format} onValueChange={(v) => patch({ format: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video course</SelectItem>
              <SelectItem value="document">Document / reading course</SelectItem>
              <SelectItem value="mixed">Mixed (video + reading)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/courses/$slug" params={{ slug: row.slug }}>
            View page
          </Link>
        </Button>
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => patch({})}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------- Webinars --------------------------------- */

function WebinarsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-webinars"],
    queryFn: async (): Promise<WebinarRow[]> => {
      const { data, error } = await supabase
        .from("webinars")
        .select(
          "id, slug, title, description, starts_at, duration_min, price_inr, is_free, published, status, meeting_url, recording_url",
        )
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WebinarRow[];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!data?.length)
    return <EmptyState title="No webinars yet" description="Webinars you create will appear here." />;

  return (
    <div className="space-y-4">
      {data.map((w) => (
        <WebinarEditor
          key={w.id}
          webinar={w}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["admin-webinars"] });
            qc.invalidateQueries({ queryKey: ["webinars"] });
          }}
        />
      ))}
    </div>
  );
}

function WebinarEditor({ webinar, onSaved }: { webinar: WebinarRow; onSaved: () => void }) {
  const [row, setRow] = useState(webinar);
  useEffect(() => setRow(webinar), [webinar]);

  async function patch(values: Partial<WebinarRow>) {
    const next = { ...row, ...values };
    setRow(next);
    const { error } = await supabase
      .from("webinars")
      .update({
        published: next.published,
        price_inr: next.price_inr,
        is_free: next.is_free,
        status: next.status,
        meeting_url: next.meeting_url,
        recording_url: next.recording_url,
      })
      .eq("id", webinar.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${webinar.title} updated`);
    onSaved();
  }

  return (
    <div className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold">{row.title}</h3>
          <p className="text-xs text-muted-foreground">
            {new Date(row.starts_at).toLocaleString()} · {row.duration_min} min
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch
            checked={row.published}
            onCheckedChange={(v) => patch({ published: v })}
            aria-label={`Toggle visibility for ${row.title}`}
          />
          <span className={row.published ? "text-success" : "text-muted-foreground"}>
            {row.published ? "Visible" : "Hidden"}
          </span>
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
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
          <Label className="text-xs">Free webinar</Label>
          <div className="flex h-10 items-center">
            <Switch checked={row.is_free} onCheckedChange={(v) => patch({ is_free: v })} />
          </div>
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
        <div className="sm:col-span-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Live meeting link</Label>
            <Input
              value={row.meeting_url ?? ""}
              placeholder="https://meet.google.com/…"
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
    </div>
  );
}

/* ------------------------------ Course content ------------------------------ */

function ContentAdmin() {
  const [courseId, setCourseId] = useState<string>("");
  const qc = useQueryClient();

  const courses = useQuery({
    queryKey: ["admin-courses-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, format")
        .order("title");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessons = useQuery({
    queryKey: ["admin-lessons", courseId],
    enabled: Boolean(courseId),
    queryFn: async (): Promise<LessonRow[]> => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("module_order")
        .order("lesson_order");
      if (error) throw error;
      return (data ?? []) as LessonRow[];
    },
  });

  const list = lessons.data ?? [];
  const nextOrder = useMemo(
    () => (list.length ? Math.max(...list.map((l) => l.lesson_order)) + 1 : 1),
    [list],
  );

  async function addLesson() {
    if (!courseId) return;
    const { error } = await supabase.from("lessons").insert({
      course_id: courseId,
      module_title: list.at(-1)?.module_title ?? "Module 1",
      module_order: list.at(-1)?.module_order ?? 1,
      title: "New lesson",
      lesson_order: nextOrder,
      kind: "video",
      duration_min: 10,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lesson added");
    qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] });
  }

  return (
    <div className="space-y-5">
      <div className="card-surface p-5">
        <Label className="text-xs">Choose a course</Label>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="mt-1 max-w-xl">
            <SelectValue placeholder="Select a course to edit its modules" />
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

      {!courseId ? (
        <EmptyState
          title="Pick a course"
          description="Select a course above to add videos, reading material and modules."
        />
      ) : lessons.isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="brand" size="sm" onClick={addLesson}>
              <Plus className="h-4 w-4" /> Add lesson
            </Button>
          </div>
          {list.length === 0 ? (
            <EmptyState
              title="No lessons yet"
              description="Add your first lesson and attach a video or document to it."
            />
          ) : (
            <div className="space-y-4">
              {list.map((lesson) => (
                <LessonEditor
                  key={lesson.id}
                  lesson={lesson}
                  onChanged={() => qc.invalidateQueries({ queryKey: ["admin-lessons", courseId] })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LessonEditor({ lesson, onChanged }: { lesson: LessonRow; onChanged: () => void }) {
  const [row, setRow] = useState(lesson);
  const [saving, setSaving] = useState(false);
  useEffect(() => setRow(lesson), [lesson]);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("lessons")
      .update({
        module_title: row.module_title,
        module_order: row.module_order,
        title: row.title,
        lesson_order: row.lesson_order,
        kind: row.kind,
        duration_min: row.duration_min,
        content: row.content,
        video_url: row.video_url,
        document_url: row.document_url,
      })
      .eq("id", lesson.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lesson saved");
    onChanged();
  }

  async function remove() {
    const { error } = await supabase.from("lessons").delete().eq("id", lesson.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lesson deleted");
    onChanged();
  }

  return (
    <div className="card-surface space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Module title</Label>
          <Input
            value={row.module_title}
            onChange={(e) => setRow({ ...row, module_title: e.target.value })}
          />
        </div>
        <div>
          <Label className="text-xs">Lesson title</Label>
          <Input value={row.title} onChange={(e) => setRow({ ...row, title: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Module #</Label>
            <Input
              type="number"
              value={row.module_order}
              onChange={(e) => setRow({ ...row, module_order: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Lesson #</Label>
            <Input
              type="number"
              value={row.lesson_order}
              onChange={(e) => setRow({ ...row, lesson_order: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label className="text-xs">Minutes</Label>
            <Input
              type="number"
              value={row.duration_min}
              onChange={(e) => setRow({ ...row, duration_min: Number(e.target.value) })}
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Lesson type</Label>
          <Select value={row.kind} onValueChange={(v) => setRow({ ...row, kind: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Document / reading</SelectItem>
              <SelectItem value="quiz">Quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {row.kind === "video" ? (
        <div>
          <Label className="text-xs">Video URL (YouTube, Vimeo or direct MP4)</Label>
          <Input
            value={row.video_url ?? ""}
            placeholder="https://www.youtube.com/watch?v=…"
            onChange={(e) => setRow({ ...row, video_url: e.target.value })}
          />
        </div>
      ) : (
        <div>
          <Label className="text-xs">Document URL (PDF or slides — optional)</Label>
          <Input
            value={row.document_url ?? ""}
            placeholder="https://…/handbook.pdf"
            onChange={(e) => setRow({ ...row, document_url: e.target.value })}
          />
        </div>
      )}

      <div>
        <Label className="text-xs">Lesson notes / reading content</Label>
        <Textarea
          rows={4}
          value={row.content ?? ""}
          onChange={(e) => setRow({ ...row, content: e.target.value })}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="brand" size="sm" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save lesson"}
        </Button>
        <Button variant="outline" size="sm" onClick={remove}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>
    </div>
  );
}

/* ---------------------------------- Orders ---------------------------------- */

function OrdersAdmin() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!data?.length)
    return <EmptyState title="No orders yet" description="Paid enrolments will show up here." />;

  return (
    <div className="card-surface overflow-x-auto p-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="p-3">Item</th>
            <th className="p-3">Type</th>
            <th className="p-3">Amount</th>
            <th className="p-3">Status</th>
            <th className="p-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {data.map((o) => (
            <tr key={o.id} className="border-t border-border">
              <td className="p-3">{o.item_title}</td>
              <td className="p-3 capitalize">{o.item_type}</td>
              <td className="p-3">₹{o.amount_inr.toLocaleString("en-IN")}</td>
              <td className="p-3 capitalize">{o.status}</td>
              <td className="p-3">{new Date(o.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
