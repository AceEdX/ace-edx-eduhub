import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bookmark, Flag, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Like / save / report controls for a community post.
 */
export function PostEngagement({ postId, reactions }: { postId: string; reactions: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reporting, setReporting] = useState(false);

  const state = useQuery({
    queryKey: ["post-engagement", postId, user?.id ?? "anon"],
    queryFn: async () => {
      const [likeCount, mine, saved] = await Promise.all([
        supabase.from("post_reactions").select("id", { count: "exact", head: true }).eq("post_id", postId),
        user
          ? supabase.from("post_reactions").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
        user
          ? supabase.from("post_saves").select("id").eq("post_id", postId).eq("user_id", user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        likes: likeCount.count ?? 0,
        liked: Boolean(mine.data),
        saved: Boolean(saved.data),
      };
    },
  });

  const likes = state.data?.likes ?? reactions;

  async function toggleLike() {
    if (!user) {
      toast.error("Sign in to react to posts");
      return;
    }
    if (state.data?.liked) {
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("post_reactions").insert({ post_id: postId, user_id: user.id });
    }
    void qc.invalidateQueries({ queryKey: ["post-engagement", postId] });
    void qc.invalidateQueries({ queryKey: ["saved-posts"] });
  }

  async function toggleSave() {
    if (!user) {
      toast.error("Sign in to save posts");
      return;
    }
    if (state.data?.saved) {
      await supabase.from("post_saves").delete().eq("post_id", postId).eq("user_id", user.id);
      toast.success("Removed from saved");
    } else {
      await supabase.from("post_saves").insert({ post_id: postId, user_id: user.id });
      toast.success("Saved to your library");
    }
    void qc.invalidateQueries({ queryKey: ["post-engagement", postId] });
    void qc.invalidateQueries({ queryKey: ["saved-posts"] });
  }

  async function report() {
    if (!user) {
      toast.error("Sign in to report content");
      return;
    }
    setReporting(true);
    const { error } = await supabase.from("content_reports").insert({
      post_id: postId,
      reporter_id: user.id,
      reason: "inappropriate",
    });
    setReporting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Reported to the moderation team");
  }

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <button
        type="button"
        onClick={toggleLike}
        className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-primary ${
          state.data?.liked ? "text-primary" : ""
        }`}
      >
        <Heart className={`h-3.5 w-3.5 ${state.data?.liked ? "fill-current" : ""}`} />
        {likes}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        className={`inline-flex items-center gap-1.5 font-semibold transition-colors hover:text-primary ${
          state.data?.saved ? "text-primary" : ""
        }`}
      >
        <Bookmark className={`h-3.5 w-3.5 ${state.data?.saved ? "fill-current" : ""}`} />
        {state.data?.saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        onClick={report}
        disabled={reporting}
        className="inline-flex items-center gap-1.5 transition-colors hover:text-destructive"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>
    </div>
  );
}
