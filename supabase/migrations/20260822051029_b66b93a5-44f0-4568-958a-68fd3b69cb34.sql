-- 1. Flags so listings can work without exposing URLs
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS has_recording boolean GENERATED ALWAYS AS (recording_url IS NOT NULL AND recording_url <> '') STORED,
  ADD COLUMN IF NOT EXISTS has_meeting_link boolean GENERATED ALWAYS AS (meeting_url IS NOT NULL AND meeting_url <> '') STORED;

-- 2. Column-level read privileges: everything except the sensitive URLs
REVOKE SELECT ON public.webinars FROM anon, authenticated;

GRANT SELECT (
  id, slug, title, description, topic, starts_at, duration_min, price_inr, is_free,
  status, certificate, image_url, registered_count, expert_id, published, created_at,
  program_type, principal_id, stream_provider, revenue_share_pct, has_recording, has_meeting_link
) ON public.webinars TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.webinars TO authenticated;
GRANT ALL ON public.webinars TO service_role;

-- 3. Secure lookup for the links
CREATE OR REPLACE FUNCTION public.webinar_links(_webinar_id uuid)
RETURNS TABLE(meeting_url text, recording_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT w.meeting_url, w.recording_url
  FROM public.webinars w
  WHERE w.id = _webinar_id
    AND auth.uid() IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.resource_principals rp
        WHERE rp.id = w.principal_id AND rp.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.webinar_registrations r
        WHERE r.webinar_id = w.id AND r.user_id = auth.uid()
      )
    )
$$;

REVOKE ALL ON FUNCTION public.webinar_links(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webinar_links(uuid) TO authenticated, service_role;

-- 4. Internal-only routines should not be callable from the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_aceedx_admin() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_revenue_share_pct() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_resource_principal(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_active_principal(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;