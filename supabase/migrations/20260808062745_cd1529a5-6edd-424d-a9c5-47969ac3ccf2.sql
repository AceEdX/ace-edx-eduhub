DROP POLICY IF EXISTS "certificates verifiable" ON public.certificates;

CREATE POLICY "own certificates readable"
ON public.certificates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.verify_certificate(_certificate_id text)
RETURNS TABLE (
  certificate_id text,
  recipient_name text,
  kind text,
  title text,
  issuer text,
  speaker text,
  duration_text text,
  issued_at timestamptz,
  revoked boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.certificate_id, c.recipient_name, c.kind, c.title, c.issuer,
         c.speaker, c.duration_text, c.issued_at, c.revoked
  FROM public.certificates c
  WHERE c.certificate_id = _certificate_id
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.verify_certificate(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;