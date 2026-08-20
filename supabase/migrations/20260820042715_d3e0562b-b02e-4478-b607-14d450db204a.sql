ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.resource_principals(id) ON DELETE SET NULL;
ALTER TABLE public.webinars ADD COLUMN IF NOT EXISTS principal_id uuid REFERENCES public.resource_principals(id) ON DELETE SET NULL;
ALTER TABLE public.webinars ADD COLUMN IF NOT EXISTS stream_provider text NOT NULL DEFAULT 'link';

CREATE OR REPLACE FUNCTION public.is_active_principal(_user_id uuid, _principal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resource_principals rp
    WHERE rp.id = _principal_id AND rp.user_id = _user_id AND rp.status = 'active'
  )
$$;
REVOKE ALL ON FUNCTION public.is_active_principal(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_active_principal(uuid, uuid) TO authenticated;

CREATE POLICY "principals manage own courses" ON public.courses FOR ALL TO authenticated
USING (principal_id IS NOT NULL AND public.is_active_principal(auth.uid(), principal_id))
WITH CHECK (principal_id IS NOT NULL AND public.is_active_principal(auth.uid(), principal_id));

CREATE POLICY "principals manage own webinars" ON public.webinars FOR ALL TO authenticated
USING (principal_id IS NOT NULL AND public.is_active_principal(auth.uid(), principal_id))
WITH CHECK (principal_id IS NOT NULL AND public.is_active_principal(auth.uid(), principal_id));

CREATE POLICY "principals manage own lessons" ON public.lessons FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.principal_id IS NOT NULL AND public.is_active_principal(auth.uid(), c.principal_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.principal_id IS NOT NULL AND public.is_active_principal(auth.uid(), c.principal_id)));

UPDATE public.subscription_plans
SET features = features || ARRAY['Host your own webinars and masterclasses on PrincipalX']
WHERE slug ILIKE '%pro%'
  AND NOT ('Host your own webinars and masterclasses on PrincipalX' = ANY(features));