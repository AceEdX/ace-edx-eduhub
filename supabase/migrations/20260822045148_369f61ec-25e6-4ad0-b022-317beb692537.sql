
-- Helper: is this user an approved (active) resource principal?
CREATE OR REPLACE FUNCTION public.is_resource_principal(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resource_principals rp
    WHERE rp.user_id = _user_id AND rp.status IN ('active','approved')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_resource_principal(uuid) TO authenticated;

-- Ownership on media assets
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE POLICY "principals insert own media" ON public.media_assets
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_resource_principal(auth.uid()));

CREATE POLICY "principals read own media" ON public.media_assets
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "principals update own media" ON public.media_assets
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "principals delete own media" ON public.media_assets
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Social publications: principals manage their own
CREATE POLICY "principals insert own publications" ON public.social_publications
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_resource_principal(auth.uid()));

CREATE POLICY "principals read own publications" ON public.social_publications
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "principals update own publications" ON public.social_publications
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "principals delete own publications" ON public.social_publications
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Storage: principals may upload clips and read their own uploads
CREATE POLICY "principals upload clips" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'clips'
    AND public.is_resource_principal(auth.uid())
  );

CREATE POLICY "principals read own media files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());

CREATE POLICY "principals delete own media files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());

-- Admin-controlled revenue share per item (falls back to the principal default when null)
ALTER TABLE public.webinars ADD COLUMN IF NOT EXISTS revenue_share_pct integer;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS revenue_share_pct integer;

CREATE OR REPLACE FUNCTION public.protect_revenue_share_pct()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.revenue_share_pct IS DISTINCT FROM OLD.revenue_share_pct
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.revenue_share_pct := OLD.revenue_share_pct;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS webinars_protect_share ON public.webinars;
CREATE TRIGGER webinars_protect_share BEFORE UPDATE ON public.webinars
  FOR EACH ROW EXECUTE FUNCTION public.protect_revenue_share_pct();

DROP TRIGGER IF EXISTS courses_protect_share ON public.courses;
CREATE TRIGGER courses_protect_share BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.protect_revenue_share_pct();
