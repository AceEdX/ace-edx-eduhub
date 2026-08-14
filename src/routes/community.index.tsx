import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeading, PageShell, EmptyState } from "@/components/layout/PageShell";
import { PostThread } from "@/components/PostThread";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { groupsQuery, postsQuery } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/community/")({
  head: () => ({
    meta: [
      { title: "The School Leaders Community — AceEdX" },
      {
        name: "description",
        content:
          "Ask questions, share best practice and learn from principals, owners and academic coordinators worldwide.",
      },
      { property: "og:title", content: "The School Leaders Community — AceEdX" },
      {
        property: "og:description",
        content: "Real discussions between practising school leaders.",
      },
    ],
  }),
  component: CommunityPage,
});

const POST_KINDS = ["discussion", "question", "resource", "achievement", "announcement"] as const;

function CommunityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const posts = useQuery(postsQuery);
  const groups = useQuery(groupsQuery);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<string>("discussion");
  const [groupId, setGroupId] = useState<string>("");
  const [feed, setFeed] = useState<"latest" | "saved">("latest");
  const [busy, setBusy] = useState(false);

  const saved = useQuery({
    queryKey: ["saved-posts", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("post_saves")
        .select("post_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.post_id);
    },
  });

  const myGroups = useQuery({
    queryKey: ["my-groups", user?.id ?? "anon"],
    enabled: Boolean(user),
    queryFn: async (): Promise<string[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.group_id);
    },
  });

  const visiblePosts = (posts.data ?? []).filter((p) =>
    feed === "saved" ? (saved.data ?? []).includes(p.id) : true,
  );

  async function toggleGroup(id: string, joined: boolean) {
    if (!user) {
      toast.error("Sign in to join a peer group");
      return;
    }
    if (joined) {
      await supabase.from("group_members").delete().eq("group_id", id).eq("user_id", user.id);
    } else {
      await supabase.from("group_members").insert({ group_id: id, user_id: user.id });
    }
    void queryClient.invalidateQueries({ queryKey: ["my-groups"] });
  }

  async function publish() {
    if (!user) return;
    if (body.trim().length < 10) {
      toast.error("Add a little more detail before posting");
      return;
    }
    setBusy(true);
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, professional_role, school_name")
      .eq("id", user.id)
      .maybeSingle();
    const { error } = await supabase.from("community_posts").insert({
      user_id: user.id,
      author_name: profile?.full_name || user.email || "AceEdX Member",
      author_role: [profile?.professional_role, profile?.school_name].filter(Boolean).join(", "),
      title: title.trim() || null,
      body: body.trim(),
      kind,
      group_id: groupId || null,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setBody("");
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
    toast.success("Posted to the community");
  }

  return (
    <PageShell>
      <PageHeading
        eyebrow="Community"
        title="Ask the people who do the job"
        description="A professional community for school leaders — questions, case studies, best practice and peer groups."
      />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {user ? (
            <div className="card-surface space-y-3 p-5">
              <h2 className="font-display text-base font-semibold">Start a discussion</h2>
              <div className="flex flex-wrap gap-2">
                {POST_KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                      kind === k ? "border-primary bg-primary-soft text-primary" : "border-border"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={160}
                placeholder="Title (optional)"
                aria-label="Discussion title"
              />
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="What is on your mind this week? Ask a question or share what worked."
                aria-label="Discussion body"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <select
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                  aria-label="Post to a peer group"
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm"
                >
                  <option value="">Whole community</option>
                  {(groups.data ?? []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <Button variant="brand" onClick={publish} disabled={busy}>
                  Post to community
                </Button>
              </div>
            </div>
          ) : (
            <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
              <p className="text-sm text-muted-foreground">
                Sign in to post, reply and follow discussions.
              </p>
              <Button variant="brand" asChild>
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join the community
                </Link>
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {(["latest", "saved"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFeed(f)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  feed === f ? "border-primary bg-primary-soft text-primary" : "border-border"
                }`}
              >
                {f === "latest" ? "Latest" : "Saved posts"}
              </button>
            ))}
          </div>

          {posts.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : visiblePosts.length === 0 ? (
            <EmptyState
              title={feed === "saved" ? "Nothing saved yet" : "No discussions yet"}
              description={
                feed === "saved"
                  ? "Tap Save on any post to keep it here."
                  : "Be the first to ask the community a question."
              }
            />
          ) : (
            <div className="space-y-4">
              {visiblePosts.map((p) => (
                <PostThread key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Peer groups</h2>
            <ul className="mt-3 space-y-2.5">
              {(groups.data ?? []).map((g) => {
                const joined = (myGroups.data ?? []).includes(g.id);
                return (
                  <li key={g.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">{g.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.id, joined)}
                      className="shrink-0 text-xs font-semibold text-primary hover:underline"
                    >
                      {joined ? "Leave" : "Join"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Principal Pulse</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              This week: what is your biggest challenge?
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {[
                ["Teacher recruitment", 38],
                ["Parent expectations", 24],
                ["Staff morale", 21],
                ["Budget pressure", 17],
              ].map(([label, pct]) => (
                <li key={label as string}>
                  <div className="flex justify-between text-xs">
                    <span>{label}</span>
                    <span className="text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-secondary">
                    <div
                      className="h-1.5 rounded-full bg-accent"
                      style={{ width: `${pct as number}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
