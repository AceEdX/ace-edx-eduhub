import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WebinarLinks = { meeting_url: string | null; recording_url: string | null };

/**
 * Meeting and recording URLs are not readable directly from the webinars table.
 * They are returned only to registered attendees, the owning resource principal
 * and admins through this secured database function.
 */
export async function fetchWebinarLinks(webinarId: string): Promise<WebinarLinks> {
  const { data, error } = await supabase.rpc("webinar_links", { _webinar_id: webinarId });
  if (error) throw error;
  const row = (data as WebinarLinks[] | null)?.[0];
  return { meeting_url: row?.meeting_url ?? null, recording_url: row?.recording_url ?? null };
}

export function useWebinarLinks(webinarId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["webinar-links", webinarId],
    enabled: Boolean(webinarId) && enabled,
    queryFn: () => fetchWebinarLinks(webinarId!),
  });
}
