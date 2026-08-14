import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill } from "@/components/cards";
import { supabase } from "@/integrations/supabase/client";

type Report = {
  id: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

export function ModerationAdmin() {
  const qc = useQueryClient();

  const reports = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async (): Promise<Report[]> => {
      const { data, error } = await supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Report[];
    },
  });

  const posts = useQuery({
    queryKey: ["admin-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, title, body, author_name, kind, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  async function resolve(id: string, status: string) {
    const { error } = await supabase
      .from("content_reports")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Report ${status}`);
    void qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  async function removePost(id: string) {
    const { error } = await supabase.from("community_posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post removed");
    void qc.invalidateQueries({ queryKey: ["admin-posts"] });
    void qc.invalidateQueries({ queryKey: ["admin-reports"] });
    void qc.invalidateQueries({ queryKey: ["posts"] });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Reported content</h2>
        {reports.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : !reports.data?.length ? (
          <EmptyState
            title="Nothing reported"
            description="Reports raised by members will appear here."
          />
        ) : (
          reports.data.map((r) => (
            <div key={r.id} className="card-surface flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Pill tone={r.status === "open" ? "accent" : "success"}>{r.status}</Pill>
                  <span className="text-sm font-semibold capitalize">{r.reason}</span>
                </div>
                {r.details && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.details}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.post_id ? "Post" : "Comment"} · {new Date(r.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {r.post_id && (
                  <Button size="sm" variant="outline" onClick={() => removePost(r.post_id!)}>
                    <Trash2 className="h-4 w-4" /> Remove post
                  </Button>
                )}
                <Button size="sm" variant="brand" onClick={() => resolve(r.id, "resolved")}>
                  Resolve
                </Button>
                <Button size="sm" variant="ghost" onClick={() => resolve(r.id, "dismissed")}>
                  Dismiss
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Recent posts</h2>
        {posts.isLoading ? (
          <Skeleton className="h-40 rounded-2xl" />
        ) : (
          <div className="card-surface divide-y divide-border p-2">
            {(posts.data ?? []).map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{p.title || p.body.slice(0, 70)}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.author_name} · {p.kind} · {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removePost(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
