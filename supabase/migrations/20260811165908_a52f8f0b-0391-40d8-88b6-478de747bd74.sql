ALTER TABLE public.profiles ALTER COLUMN visibility SET DEFAULT 'private';

DROP POLICY IF EXISTS "public profiles readable" ON public.profiles;
CREATE POLICY "member profiles readable"
ON public.profiles FOR SELECT TO authenticated
USING (visibility = 'public' OR auth.uid() = id);

REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;