REVOKE EXECUTE ON FUNCTION public.course_outline(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM anon, authenticated;

DROP POLICY IF EXISTS "settings public read" ON public.platform_settings;
CREATE POLICY "settings authenticated read" ON public.platform_settings
FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.platform_settings FROM anon;

DROP POLICY IF EXISTS "anyone can enquire" ON public.sponsorships;
CREATE POLICY "anon can enquire without account" ON public.sponsorships
FOR INSERT TO anon WITH CHECK (user_id IS NULL);
CREATE POLICY "users can enquire as themselves" ON public.sponsorships
FOR INSERT TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());