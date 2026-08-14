import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ResourcesAdmin() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Leadership");
  const [isFree, setIsFree] = useState(true);
  const [isToolkit, setIsToolkit] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("resources")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function upload() {
    if (!title.trim() || !file) {
      toast.error("Add a title and choose a PDF");
      return;
    }
    setBusy(true);
    const slug = slugify(title);
    const path = `library/${slug}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("resources")
      .upload(path, file, { upsert: true, contentType: file.type || "application/pdf" });
    if (upErr) {
      setBusy(false);
      toast.error(upErr.message);
      return;
    }
    const { error } = await supabase.from("resources").insert({
      slug,
      title: title.trim(),
      description: description.trim() || null,
      category,
      resource_type: "PDF",
      is_toolkit: isToolkit,
      is_free: isFree,
      file_url: path,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setDescription("");
    setFile(null);
    toast.success("Resource published");
    void qc.invalidateQueries({ queryKey: ["admin-resources"] });
    void qc.invalidateQueries({ queryKey: ["resources"] });
  }

  async function remove(id: string, fileUrl: string | null) {
    if (fileUrl && !/^https?:/i.test(fileUrl)) {
      await supabase.storage.from("resources").remove([fileUrl]);
    }
    const { error } = await supabase.from("resources").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Resource deleted");
    void qc.invalidateQueries({ queryKey: ["admin-resources"] });
    void qc.invalidateQueries({ queryKey: ["resources"] });
  }

  async function togglePaid(id: string, free: boolean) {
    const { error } = await supabase.from("resources").update({ is_free: free }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["admin-resources"] });
    void qc.invalidateQueries({ queryKey: ["resources"] });
  }

  return (
    <div className="space-y-8">
      <div className="card-surface space-y-4 p-5">
        <h2 className="font-display text-lg font-semibold">Upload a new resource</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Category</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Description</Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isFree} onCheckedChange={setIsFree} aria-label="Free resource" />
            <span>{isFree ? "Free download" : "Paid — purchase required"}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={isToolkit}
              onCheckedChange={setIsToolkit}
              aria-label="Part of the Principal's Toolkit"
            />
            <span>Principal&apos;s Toolkit</span>
          </label>
          <Input
            type="file"
            accept="application/pdf"
            className="max-w-xs"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <Button variant="brand" onClick={upload} disabled={busy}>
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Publish resource"}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : !data?.length ? (
        <EmptyState title="No resources yet" description="Upload the first document above." />
      ) : (
        <div className="card-surface divide-y divide-border p-2">
          {data.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-4 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.category} · {r.resource_type} · {r.downloads} downloads
                </p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={r.is_free}
                    onCheckedChange={(v) => togglePaid(r.id, v)}
                    aria-label={`Toggle free access for ${r.title}`}
                  />
                  <span>{r.is_free ? "Free" : "Paid"}</span>
                </label>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id, r.file_url)}>
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

export function SettingsAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("*").order("key");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;
  if (!data?.length)
    return <EmptyState title="No settings yet" description="Platform switches will appear here." />;

  return (
    <div className="space-y-4">
      {data.map((s) => (
        <SettingRow
          key={s.key}
          setting={s as { key: string; value: unknown; description: string | null }}
          onSaved={() => qc.invalidateQueries({ queryKey: ["admin-settings"] })}
        />
      ))}
    </div>
  );
}

function SettingRow({
  setting,
  onSaved,
}: {
  setting: { key: string; value: unknown; description: string | null };
  onSaved: () => void;
}) {
  const [value, setValue] = useState(JSON.stringify(setting.value));
  const [busy, setBusy] = useState(false);

  async function save() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      toast.error("Value must be valid JSON (true, false, 1200, \"text\")");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: parsed as never })
      .eq("key", setting.key);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Setting saved");
    onSaved();
  }

  return (
    <div className="card-surface flex flex-wrap items-end justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="font-mono text-sm font-semibold">{setting.key}</p>
        <p className="text-xs text-muted-foreground">{setting.description ?? "Platform setting"}</p>
      </div>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} className="w-56" />
        <Button size="sm" variant="brand" disabled={busy} onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
