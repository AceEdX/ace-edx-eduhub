import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pill } from "@/components/cards";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Post } from "@/lib/api";

type Comment = {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

/**
 * A community post with its full reply thread. Any signed-in member can answer
 * a question asked by anyone else.
 */
export function PostThread({ post }: { post: Post }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const comments = useQuery({
    queryKey: ["comments", post.id],
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase
        .from("community_comments")
        .select("*")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Comment[];
    },
  });

  const count = comments.data?.length ?? 0;

  async function submit() {
    if (!user) return;
    const text = body.trim();
    if (text.length < 2) {
      toast.error("Write a reply first");
      return;
    }
    setBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const { error } = await supabase.from("community_comments").insert({
      post_id: post.id,
      user_id: user.id,
      author_name: profile?.full_name || user.email || "AceEdX Member",
      body: text,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setBody("");
    await comments.refetch();
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
    toast.success("Reply posted");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("community_comments").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await comments.refetch();
  }

  return (
    <article className="card-surface p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
          {initials(post.author_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{post.author_name}</p>
          <p className="text-xs text-muted-foreground">{post.author_role ?? "AceEdX member"}</p>
          {post.title && (
            <h3 className="mt-3 font-display text-base font-semibold leading-snug">{post.title}</h3>
          )}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {post.body}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {post.topic && <Pill tone="primary">{post.topic}</Pill>}
            <span>{post.views.toLocaleString()} views</span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {count === 0 ? "Answer this" : `${count} ${count === 1 ? "reply" : "replies"}`}
            </button>
          </div>

          {open && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              {comments.isLoading ? (
                <p className="text-xs text-muted-foreground">Loading replies…</p>
              ) : count === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No replies yet — be the first to help.
                </p>
              ) : (
                <ul className="space-y-3">
                  {(comments.data ?? []).map((c) => (
                    <li key={c.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[10px] font-semibold text-primary">
                        {initials(c.author_name)}
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl bg-secondary/60 px-3.5 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold">{c.author_name}</p>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(c.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                          {c.body}
                        </p>
                      </div>
                      {user?.id === c.user_id && (
                        <button
                          type="button"
                          aria-label="Delete reply"
                          onClick={() => remove(c.id)}
                          className="mt-1 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {user ? (
                <div className="space-y-2">
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    maxLength={1500}
                    placeholder="Share your answer or experience…"
                    aria-label="Write a reply"
                  />
                  <div className="flex justify-end">
                    <Button size="sm" variant="brand" onClick={submit} disabled={busy}>
                      <Send className="h-4 w-4" /> Post reply
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/60 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Sign in to answer this question.</p>
                  <Button size="sm" variant="brand" asChild>
                    <Link to="/auth" search={{ mode: "signin" }}>
                      Sign in
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
