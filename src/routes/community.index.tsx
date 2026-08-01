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

function CommunityPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const posts = useQuery(postsQuery);
  const groups = useQuery(groupsQuery);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

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
      kind: "discussion",
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
              <div className="flex justify-end">
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

          {posts.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : (posts.data ?? []).length === 0 ? (
            <EmptyState
              title="No discussions yet"
              description="Be the first to ask the community a question."
            />
          ) : (
            <div className="space-y-4">
              {(posts.data ?? []).map((p) => (
                <PostThread key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Peer groups</h2>
            <ul className="mt-3 space-y-2.5">
              {(groups.data ?? []).map((g) => (
                <li key={g.id} className="flex items-center justify-between text-sm">
                  <span>{g.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.members_count.toLocaleString()}
                  </span>
                </li>
              ))}
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
