import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Resource files live in the private `resources` bucket. We mint a short-lived
 * signed URL and trigger the browser download.
 */
export async function downloadResource(opts: { fileUrl: string | null; title: string }) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    toast.error("Sign in to download resources from the library.");
    return;
  }

  if (!opts.fileUrl) {
    toast.error("This file is being prepared and will be available shortly.");
    return;
  }

  if (/^https?:\/\//i.test(opts.fileUrl)) {
    window.open(opts.fileUrl, "_blank", "noopener,noreferrer");
    return;
  }

  const filename = `${opts.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.pdf`;
  const { data, error } = await supabase.storage
    .from("resources")
    .createSignedUrl(opts.fileUrl, 120, { download: filename });

  if (error || !data?.signedUrl) {
    toast.error("Could not open that download. Please try again.");
    return;
  }

  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast.success("Download started");
}
