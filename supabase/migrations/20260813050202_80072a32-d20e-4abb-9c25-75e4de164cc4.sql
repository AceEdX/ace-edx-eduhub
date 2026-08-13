
-- === profiles: principal fields ===
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS board text,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS school_website text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending';

-- === school_verifications (private) ===
CREATE TABLE IF NOT EXISTS public.school_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  mobile text,
  school_name text NOT NULL,
  affiliation_number text NOT NULL,
  board text,
  designation text,
  city text,
  state text,
  country text,
  school_website text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS school_verifications_status_idx ON public.school_verifications(status);

GRANT SELECT, INSERT, UPDATE ON public.school_verifications TO authenticated;
GRANT ALL ON public.school_verifications TO service_role;
ALTER TABLE public.school_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own verification read" ON public.school_verifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own verification insert" ON public.school_verifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own verification update" ON public.school_verifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "admins manage verifications" ON public.school_verifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER school_verifications_updated BEFORE UPDATE ON public.school_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === resource principal applications ===
CREATE TABLE IF NOT EXISTS public.resource_principal_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  headline text,
  bio text NOT NULL,
  expertise text[] NOT NULL DEFAULT '{}',
  speaking_topics text[] NOT NULL DEFAULT '{}',
  credentials text,
  sample_work_url text,
  linkedin_url text,
  status text NOT NULL DEFAULT 'applicant',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS rp_applications_status_idx ON public.resource_principal_applications(status);

GRANT SELECT, INSERT, UPDATE ON public.resource_principal_applications TO authenticated;
GRANT ALL ON public.resource_principal_applications TO service_role;
ALTER TABLE public.resource_principal_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own application read" ON public.resource_principal_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own application insert" ON public.resource_principal_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own application update" ON public.resource_principal_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('applicant','rejected'))
  WITH CHECK (auth.uid() = user_id AND status IN ('applicant','rejected'));
CREATE POLICY "admins manage applications" ON public.resource_principal_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER rp_applications_updated BEFORE UPDATE ON public.resource_principal_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === resource principals (public directory) ===
CREATE TABLE IF NOT EXISTS public.resource_principals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  headline text,
  school_name text,
  city text,
  country text,
  bio text,
  expertise text[] NOT NULL DEFAULT '{}',
  speaking_topics text[] NOT NULL DEFAULT '{}',
  credentials text,
  photo_url text,
  linkedin_url text,
  website_url text,
  status text NOT NULL DEFAULT 'active',
  featured boolean NOT NULL DEFAULT false,
  revenue_share_pct integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS resource_principals_status_idx ON public.resource_principals(status);

GRANT SELECT ON public.resource_principals TO anon;
GRANT SELECT ON public.resource_principals TO authenticated;
GRANT ALL ON public.resource_principals TO service_role;
ALTER TABLE public.resource_principals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource principals public read" ON public.resource_principals
  FOR SELECT TO anon, authenticated
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage resource principals" ON public.resource_principals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER resource_principals_updated BEFORE UPDATE ON public.resource_principals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- === platform settings ===
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings public read" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER platform_settings_updated BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('allow_unverified_free_access', 'true'::jsonb, 'Unverified principals may browse free content'),
  ('require_verification_for_community', 'true'::jsonb, 'Only verified principals can post in the community')
ON CONFLICT (key) DO NOTHING;

-- === lessons: gate paid content ===
DROP POLICY IF EXISTS "lessons public read" ON public.lessons;

CREATE POLICY "lessons entitled read" ON public.lessons
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = lessons.course_id
        AND c.published
        AND (
          c.is_free
          OR EXISTS (
            SELECT 1 FROM public.enrollments e
            WHERE e.course_id = c.id AND e.user_id = auth.uid()
          )
        )
    )
    OR public.has_role(auth.uid(), 'admin')
  );

-- public curriculum outline (no content/urls)
CREATE OR REPLACE FUNCTION public.course_outline(_course_id uuid)
RETURNS TABLE(
  id uuid, module_title text, module_order integer,
  title text, lesson_order integer, kind text, duration_min integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT l.id, l.module_title, l.module_order, l.title, l.lesson_order, l.kind, l.duration_min
  FROM public.lessons l
  JOIN public.courses c ON c.id = l.course_id
  WHERE l.course_id = _course_id AND c.published
  ORDER BY l.module_order, l.lesson_order
$$;

REVOKE ALL ON FUNCTION public.course_outline(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.course_outline(uuid) TO anon, authenticated, service_role;
