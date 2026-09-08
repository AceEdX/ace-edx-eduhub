-- 1. Protect engagement counters on community_posts
CREATE OR REPLACE FUNCTION public.protect_post_counters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.views := 0;
    NEW.reactions := 0;
  ELSE
    NEW.views := OLD.views;
    NEW.reactions := OLD.reactions;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_post_counters() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_post_counters ON public.community_posts;
CREATE TRIGGER trg_protect_post_counters
BEFORE INSERT OR UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.protect_post_counters();

-- 2. Self-scope privileged predicate helpers so signed-in users cannot probe other accounts
CREATE OR REPLACE FUNCTION public.can_manage_webinar(_user_id uuid, _webinar_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.webinars w
      WHERE w.id = _webinar_id
        AND (
          public.has_role(_user_id, 'admin')
          OR EXISTS (SELECT 1 FROM public.resource_principals rp
                     WHERE rp.id = w.principal_id AND rp.user_id = _user_id)
        )
    )
$$;

CREATE OR REPLACE FUNCTION public.is_active_principal(_user_id uuid, _principal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.resource_principals rp
      WHERE rp.id = _principal_id AND rp.user_id = _user_id AND rp.status = 'active'
    )
$$;

CREATE OR REPLACE FUNCTION public.is_webinar_registrant(_user_id uuid, _webinar_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.webinar_registrations r
      WHERE r.webinar_id = _webinar_id AND r.user_id = _user_id
    )
$$;

CREATE OR REPLACE FUNCTION public.is_resource_principal(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL
    AND (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.resource_principals rp
      WHERE rp.user_id = _user_id AND rp.status IN ('active','approved')
    )
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.principal_session_stats(_principal_id uuid)
RETURNS TABLE(webinar_id uuid, registered integer, attended integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- 3. Reconfirm profile verification status can only be changed by admins
DROP TRIGGER IF EXISTS trg_protect_profile_verification ON public.profiles;
CREATE TRIGGER trg_protect_profile_verification
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_verification_status();