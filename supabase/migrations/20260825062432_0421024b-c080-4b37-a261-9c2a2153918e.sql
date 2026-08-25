DROP POLICY IF EXISTS "principals upload clips" ON storage.objects;
CREATE POLICY "principals upload media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] IN ('clips','uploads','lessons','thumbnails')
  AND public.is_resource_principal(auth.uid())
);

CREATE OR REPLACE FUNCTION public.principal_session_stats(_principal_id uuid)
RETURNS TABLE(webinar_id uuid, registered integer, attended integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.id,
         COALESCE(count(r.id), 0)::int,
         COALESCE(count(r.id) FILTER (WHERE r.attended), 0)::int
  FROM public.webinars w
  LEFT JOIN public.webinar_registrations r ON r.webinar_id = w.id
  WHERE w.principal_id = _principal_id
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.is_active_principal(auth.uid(), _principal_id)
    )
  GROUP BY w.id
$$;

REVOKE ALL ON FUNCTION public.principal_session_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.principal_session_stats(uuid) TO authenticated;