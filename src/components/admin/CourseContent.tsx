import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, Upload } from "lucide-react";
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
import { LessonMedia } from "@/components/LessonMedia";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export type LessonRow = {
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

/** Uploads a file into the private media bucket and returns a long-lived signed URL. */
async function uploadToMedia(file: File, folder: "lessons" | "uploads") {
  const safe = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .slice(-60);
  const path = `${folder}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage
    .from("media")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("media")
    .createSignedUrl(path, TEN_YEARS);
  if (signErr) throw signErr;
  return data.signedUrl;
}

/**
 * Shared curriculum editor. Admins see every course; a Resource Principal
 * passes their `principalId` and only sees and edits their own courses.
 */
export function CourseContentEditor({ principalId }: { principalId?: string }) {
  const [courseId, setCourseId] = useState<string>("");
  const qc = useQueryClient();

  const courses = useQuery({
    queryKey: ["content-courses", principalId ?? "all"],
    queryFn: async () => {
      let q = supabase.from("courses").select("id, title, format").order("title");
      if (principalId) q = q.eq("principal_id", principalId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const lessons = useQuery({
    queryKey: ["content-lessons", courseId],
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

  const refresh = () => qc.invalidateQueries({ queryKey: ["content-lessons", courseId] });

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
    refresh();
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
        {principalId && !courses.isLoading && !(courses.data ?? []).length && (
          <p className="mt-3 text-sm text-muted-foreground">
            Create a course in the Courses tab first, then add its modules and videos here.
          </p>
        )}
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
                <LessonEditor key={lesson.id} lesson={lesson} onChanged={refresh} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function LessonEditor({ lesson, onChanged }: { lesson: LessonRow; onChanged: () => void }) {
  const [row, setRow] = useState(lesson);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => setRow(lesson), [lesson]);

  async function save(values?: Partial<LessonRow>) {
    const next = { ...row, ...values };
    setRow(next);
    setSaving(true);
    const { error } = await supabase
      .from("lessons")
      .update({
        module_title: next.module_title,
        module_order: next.module_order,
        title: next.title,
        lesson_order: next.lesson_order,
        kind: next.kind,
        duration_min: next.duration_min,
        content: next.content,
        video_url: next.video_url,
        document_url: next.document_url,
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

  async function upload(file: File, field: "video_url" | "document_url") {
    setUploading(true);
    try {
      const url = await uploadToMedia(file, "lessons");
      await save({ [field]: url } as Partial<LessonRow>);
      toast.success("File uploaded and attached");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Video URL (YouTube, Vimeo or direct MP4)</Label>
            <Input
              value={row.video_url ?? ""}
              placeholder="https://www.youtube.com/watch?v=…"
              onChange={(e) => setRow({ ...row, video_url: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">or upload a video file</Label>
            <Input
              type="file"
              accept="video/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file, "video_url");
              }}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Document URL (PDF or slides — optional)</Label>
            <Input
              value={row.document_url ?? ""}
              placeholder="https://…/handbook.pdf"
              onChange={(e) => setRow({ ...row, document_url: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs">or upload a PDF</Label>
            <Input
              type="file"
              accept="application/pdf"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file, "document_url");
              }}
            />
          </div>
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

      <div className="flex flex-wrap gap-2">
        <Button
          variant="brand"
          size="sm"
          onClick={() => void save()}
          disabled={saving || uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
          {uploading ? "Uploading…" : saving ? "Saving…" : "Save lesson"}
        </Button>
        {(row.video_url || row.document_url) && (
          <Button variant="outline" size="sm" onClick={() => setPreview((p) => !p)}>
            <Upload className="h-4 w-4 rotate-180" /> {preview ? "Hide preview" : "Preview"}
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => void remove()}>
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {preview && (
        <LessonMedia
          lesson={{
            title: row.title,
            kind: row.kind,
            duration_min: row.duration_min,
            video_url: row.video_url,
            document_url: row.document_url,
          }}
        />
      )}
    </div>
  );
}
