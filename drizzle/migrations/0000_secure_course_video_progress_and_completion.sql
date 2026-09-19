ALTER TABLE public.lesson_progress
  ADD COLUMN IF NOT EXISTS watched_seconds integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.course_lesson_heartbeat(_course_id uuid, _lesson_id uuid)
RETURNS TABLE(course_progress integer, lesson_complete boolean, certificate_ready boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _lesson public.lessons%ROWTYPE;
  _total_seconds integer;
  _watched_seconds integer;
  _lesson_done boolean;
  _course_pct integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE user_id = _uid AND course_id = _course_id
  ) THEN RAISE EXCEPTION 'Not enrolled in this course'; END IF;

  SELECT * INTO _lesson
  FROM public.lessons
  WHERE id = _lesson_id AND course_id = _course_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lesson not found'; END IF;

  INSERT INTO public.lesson_progress (user_id, course_id, lesson_id, watched_seconds, completed_at)
  VALUES (
    _uid,
    _course_id,
    _lesson_id,
    LEAST(15, GREATEST(1, _lesson.duration_min * 60)),
    CASE WHEN LEAST(15, GREATEST(1, _lesson.duration_min * 60)) >= CEIL(_lesson.duration_min * 60 * 0.8) THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET watched_seconds = LEAST(
        GREATEST(1, _lesson.duration_min * 60),
        public.lesson_progress.watched_seconds + 15
      ),
      completed_at = CASE
        WHEN LEAST(GREATEST(1, _lesson.duration_min * 60), public.lesson_progress.watched_seconds + 15)
             >= CEIL(GREATEST(1, _lesson.duration_min * 60) * 0.8)
        THEN COALESCE(public.lesson_progress.completed_at, now())
        ELSE public.lesson_progress.completed_at
      END
  RETURNING watched_seconds, completed_at IS NOT NULL
  INTO _watched_seconds, _lesson_done;

  SELECT COALESCE(sum(GREATEST(1, l.duration_min * 60)), 0),
         COALESCE(sum(LEAST(GREATEST(1, l.duration_min * 60), COALESCE(lp.watched_seconds, 0))), 0)
  INTO _total_seconds, _watched_seconds
  FROM public.lessons l
  LEFT JOIN public.lesson_progress lp
    ON lp.lesson_id = l.id AND lp.user_id = _uid
  WHERE l.course_id = _course_id;

  _course_pct := CASE
    WHEN _total_seconds = 0 THEN 0
    ELSE LEAST(100, ROUND((_watched_seconds::numeric / _total_seconds) * 100)::integer)
  END;

  UPDATE public.enrollments
  SET progress = _course_pct,
      completed_at = CASE
        WHEN _course_pct >= 80 THEN COALESCE(completed_at, now())
        ELSE completed_at
      END
  WHERE user_id = _uid AND course_id = _course_id;

  RETURN QUERY SELECT _course_pct, _lesson_done, (_course_pct >= 80);
END;
$$;

REVOKE ALL ON FUNCTION public.course_lesson_heartbeat(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.course_lesson_heartbeat(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.webinar_heartbeat(_webinar_id uuid)
RETURNS TABLE(seconds_watched integer, is_attended boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _w public.webinars%ROWTYPE;
  _r public.webinar_registrations%ROWTYPE;
  _delta integer;
  _threshold integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _w FROM public.webinars WHERE id = _webinar_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
  SELECT * INTO _r FROM public.webinar_registrations WHERE user_id = _uid AND webinar_id = _webinar_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not registered for this session'; END IF;

  _delta := LEAST(30, GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (now() - _r.last_seen_at))::int, 15)));
  _threshold := CEIL(_w.duration_min * 60 * (COALESCE(_w.attendance_threshold_pct, 80)::numeric / 100))::int;

  UPDATE public.webinar_registrations r
  SET attendance_seconds = LEAST(_w.duration_min * 60, r.attendance_seconds + _delta),
      attendance_minutes = LEAST(_w.duration_min, (LEAST(_w.duration_min * 60, r.attendance_seconds + _delta) / 60)),
      last_seen_at = now(),
      joined_at = COALESCE(r.joined_at, now()),
      attended = r.attended OR (LEAST(_w.duration_min * 60, r.attendance_seconds + _delta) >= _threshold)
  WHERE r.user_id = _uid AND r.webinar_id = _webinar_id
  RETURNING r.attendance_seconds, r.attended INTO seconds_watched, is_attended;

  IF is_attended AND _w.certificate THEN
    PERFORM public.issue_certificate('webinar', NULL, _webinar_id);
  END IF;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.webinar_heartbeat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webinar_heartbeat(uuid) TO authenticated, service_role;