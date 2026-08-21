DROP POLICY IF EXISTS "media member read" ON storage.objects;

CREATE POLICY "media published read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'media'
  AND (
    public.has_role(auth.uid(), 'admin') OR EXISTS (
      SELECT 1 FROM public.media_assets m
      WHERE m.published
        AND (m.url = objects.name OR m.url LIKE '%' || objects.name OR m.thumbnail_url = objects.name OR m.thumbnail_url LIKE '%' || objects.name)
    )
  )
);

REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.course_outline(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_principal(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_aceedx_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;