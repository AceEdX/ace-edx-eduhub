
-- ORDERS ------------------------------------------------------------------
DROP POLICY IF EXISTS "own orders" ON public.orders;
CREATE POLICY "own orders readable" ON public.orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own pending orders insert" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending' AND provider_payment_id IS NULL);

-- ENROLLMENTS ---------------------------------------------------------------
DROP POLICY IF EXISTS "own enrollments" ON public.enrollments;
CREATE POLICY "own enrollments readable" ON public.enrollments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own enrollments insert" ON public.enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND progress = 0 AND completed_at IS NULL);
CREATE POLICY "own enrollments delete" ON public.enrollments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admins manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- WEBINAR REGISTRATIONS ------------------------------------------------------
DROP POLICY IF EXISTS "own registrations" ON public.webinar_registrations;
CREATE POLICY "own registrations readable" ON public.webinar_registrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own registrations insert" ON public.webinar_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND attended = false AND attendance_minutes = 0);
CREATE POLICY "own registrations delete" ON public.webinar_registrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "admins manage registrations" ON public.webinar_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CERTIFICATES ---------------------------------------------------------------
DROP POLICY IF EXISTS "own certificate insert" ON public.certificates;
CREATE POLICY "admins insert certificates" ON public.certificates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TRUSTED ROUTINES -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_course_progress(_course_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _total integer;
  _done integer;
  _pct integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT count(*) INTO _total FROM public.lessons WHERE course_id = _course_id;
  IF _total = 0 THEN RETURN 0; END IF;

  SELECT count(DISTINCT lp.lesson_id) INTO _done
  FROM public.lesson_progress lp
  JOIN public.lessons l ON l.id = lp.lesson_id AND l.course_id = _course_id
  WHERE lp.user_id = _uid;

  _pct := LEAST(100, ROUND((_done::numeric / _total) * 100)::int);

  UPDATE public.enrollments
  SET progress = _pct,
      completed_at = CASE WHEN _pct = 100 THEN COALESCE(completed_at, now()) ELSE NULL END
  WHERE user_id = _uid AND course_id = _course_id;

  RETURN _pct;
END; $$;

CREATE OR REPLACE FUNCTION public.record_webinar_attendance(_webinar_id uuid, _minutes integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _w public.webinars%ROWTYPE;
  _capped integer;
  _elapsed integer;
  _attended boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _w FROM public.webinars WHERE id = _webinar_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Webinar not found'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.webinar_registrations
    WHERE user_id = _uid AND webinar_id = _webinar_id
  ) THEN RAISE EXCEPTION 'Not registered for this webinar'; END IF;

  -- a learner can never bank more minutes than the session length, nor more
  -- time than has actually elapsed since the session opened
  _elapsed := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (now() - _w.starts_at)) / 60)::int);
  _capped := LEAST(GREATEST(COALESCE(_minutes, 0), 0), _w.duration_min, _elapsed);
  _attended := _capped >= CEIL(_w.duration_min * 0.8);

  UPDATE public.webinar_registrations
  SET attendance_minutes = GREATEST(attendance_minutes, _capped),
      attended = attended OR _attended,
      joined_at = COALESCE(joined_at, now())
  WHERE user_id = _uid AND webinar_id = _webinar_id;

  RETURN _attended;
END; $$;

CREATE OR REPLACE FUNCTION public.issue_certificate(_kind text, _course_id uuid DEFAULT NULL, _webinar_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _name text;
  _cert_id text;
  _title text;
  _speaker text;
  _duration text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(NULLIF(full_name, ''), 'AceEdX Member') INTO _name
  FROM public.profiles WHERE id = _uid;
  _name := COALESCE(_name, 'AceEdX Member');

  IF _kind = 'course' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = _uid AND e.course_id = _course_id AND e.completed_at IS NOT NULL
    ) THEN RAISE EXCEPTION 'Course not completed'; END IF;

    SELECT c.title, (c.duration_hours::text || ' hours') INTO _title, _duration
    FROM public.courses c WHERE c.id = _course_id AND c.certificate;
    IF _title IS NULL THEN RAISE EXCEPTION 'No certificate for this course'; END IF;

    SELECT certificate_id INTO _cert_id FROM public.certificates
    WHERE user_id = _uid AND course_id = _course_id LIMIT 1;
    IF _cert_id IS NOT NULL THEN RETURN _cert_id; END IF;

    INSERT INTO public.certificates (user_id, recipient_name, kind, title, duration_text, course_id)
    VALUES (_uid, _name, 'course', _title, _duration, _course_id)
    RETURNING certificate_id INTO _cert_id;
    RETURN _cert_id;

  ELSIF _kind = 'webinar' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.webinar_registrations r
      WHERE r.user_id = _uid AND r.webinar_id = _webinar_id AND r.attended
    ) THEN RAISE EXCEPTION 'Attendance not verified'; END IF;

    SELECT w.title, (w.duration_min::text || ' minutes'), COALESCE(e.name, 'AceEdX Faculty')
      INTO _title, _duration, _speaker
    FROM public.webinars w
    LEFT JOIN public.experts e ON e.id = w.expert_id
    WHERE w.id = _webinar_id AND w.certificate;
    IF _title IS NULL THEN RAISE EXCEPTION 'No certificate for this webinar'; END IF;

    SELECT certificate_id INTO _cert_id FROM public.certificates
    WHERE user_id = _uid AND webinar_id = _webinar_id LIMIT 1;
    IF _cert_id IS NOT NULL THEN RETURN _cert_id; END IF;

    INSERT INTO public.certificates (user_id, recipient_name, kind, title, speaker, duration_text, webinar_id)
    VALUES (_uid, _name, 'webinar', _title, _speaker, _duration, _webinar_id)
    RETURNING certificate_id INTO _cert_id;
    RETURN _cert_id;
  END IF;

  RAISE EXCEPTION 'Unknown certificate kind';
END; $$;

REVOKE ALL ON FUNCTION public.sync_course_progress(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_webinar_attendance(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.issue_certificate(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_course_progress(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_webinar_attendance(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.issue_certificate(text, uuid, uuid) TO authenticated, service_role;
