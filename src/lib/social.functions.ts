import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const postSchema = z.object({
  text: z.string().min(5).max(2900),
  linkUrl: z.string().url().optional(),
  publicationId: z.string().uuid().optional(),
});

export const publishLinkedInPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => postSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can publish to LinkedIn.");

    const lovableKey = process.env["LOVABLE_API_KEY"];
    const linkedInKey = process.env["LINKEDIN_API_KEY"];
    if (!lovableKey || !linkedInKey) throw new Error("LinkedIn is not connected yet.");

    const gateway = "https://connector-gateway.lovable.dev/linkedin";
    const headers = {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": linkedInKey,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    };

    const meRes = await fetch(`${gateway}/v2/userinfo`, { headers });
    if (!meRes.ok) {
      const body = await meRes.text();
      console.error("[linkedin] userinfo failed", meRes.status, body);
      throw new Error(`LinkedIn rejected the request [${meRes.status}]: ${body.slice(0, 300)}`);
    }
    const me = (await meRes.json()) as { sub?: string };
    if (!me.sub) throw new Error("Could not read the connected LinkedIn account.");

    const shareContent: Record<string, unknown> = {
      shareCommentary: { text: data.text },
      shareMediaCategory: data.linkUrl ? "ARTICLE" : "NONE",
    };
    if (data.linkUrl) {
      shareContent["media"] = [{ status: "READY", originalUrl: data.linkUrl }];
    }

    const postRes = await fetch(`${gateway}/v2/ugcPosts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        author: `urn:li:person:${me.sub}`,
        lifecycleState: "PUBLISHED",
        specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });

    if (!postRes.ok) {
      const body = await postRes.text();
      console.error("[linkedin] ugcPosts failed", postRes.status, body);
      if (data.publicationId) {
        await supabase
          .from("social_publications")
          .update({ status: "failed", error: body.slice(0, 500) })
          .eq("id", data.publicationId);
      }
      throw new Error(`LinkedIn could not publish the post [${postRes.status}]: ${body.slice(0, 300)}`);
    }

    const postId = postRes.headers.get("x-restli-id") ?? "";
    const publishedUrl = postId
      ? `https://www.linkedin.com/feed/update/${postId}`
      : "https://www.linkedin.com/feed/";

    if (data.publicationId) {
      await supabase
        .from("social_publications")
        .update({ status: "published", published_url: publishedUrl, error: null })
        .eq("id", data.publicationId);
    } else {
      await supabase.from("social_publications").insert({
        channel: "linkedin",
        caption: data.text,
        link_url: data.linkUrl ?? null,
        status: "published",
        published_url: publishedUrl,
        created_by: userId,
      });
    }

    return { publishedUrl };
  });
