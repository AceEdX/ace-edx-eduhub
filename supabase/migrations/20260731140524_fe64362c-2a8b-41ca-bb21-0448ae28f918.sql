ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS document_url text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS format text NOT NULL DEFAULT 'video';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) IN ('aceedx1@gmail.com','aceedx1@gmail')
ON CONFLICT (user_id, role) DO NOTHING;

CREATE OR REPLACE FUNCTION public.grant_aceedx_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('aceedx1@gmail.com','aceedx1@gmail') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.grant_aceedx_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_aceedx_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_aceedx_admin
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_aceedx_admin();

DROP POLICY IF EXISTS "admins manage orders" ON public.orders;
CREATE POLICY "admins manage orders" ON public.orders
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));