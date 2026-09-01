-- 1. Webinar engine columns
ALTER TABLE public.webinars
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS seat_cap integer,
  ADD COLUMN IF NOT EXISTS waiting_room_min integer NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS attendance_threshold_pct integer NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS agenda text,
  ADD COLUMN IF NOT EXISTS registration_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text,
  ADD COLUMN IF NOT EXISTS cta_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_message text,
  ADD COLUMN IF NOT EXISTS live_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS live_ended_at timestamptz;

ALTER TABLE public.webinar_registrations
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS attendance_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta_clicks integer NOT NULL DEFAULT 0;

-- 2. Helper: who may run a session
CREATE OR REPLACE FUNCTION public.can_manage_webinar(_user_id uuid, _webinar_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.webinars w
    WHERE w.id = _webinar_id
      AND (
        public.has_role(_user_id, 'admin')
        OR EXISTS (SELECT 1 FROM public.resource_principals rp
                   WHERE rp.id = w.principal_id AND rp.user_id = _user_id)
      )
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_manage_webinar(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_webinar(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_webinar_registrant(_user_id uuid, _webinar_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.webinar_registrations r
    WHERE r.webinar_id = _webinar_id AND r.user_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_webinar_registrant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_webinar_registrant(uuid, uuid) TO authenticated, service_role;

-- 3. Live chat
CREATE TABLE IF NOT EXISTS public.webinar_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  is_host boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.webinar_chat TO authenticated;
GRANT ALL ON public.webinar_chat TO service_role;
ALTER TABLE public.webinar_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat readable by room" ON public.webinar_chat FOR SELECT TO authenticated
  USING (public.is_webinar_registrant(auth.uid(), webinar_id) OR public.can_manage_webinar(auth.uid(), webinar_id));
CREATE POLICY "chat insert by room" ON public.webinar_chat FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_webinar_registrant(auth.uid(), webinar_id) OR public.can_manage_webinar(auth.uid(), webinar_id)));
CREATE POLICY "chat delete by host or author" ON public.webinar_chat FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_webinar(auth.uid(), webinar_id));

-- 4. Q&A
CREATE TABLE IF NOT EXISTS public.webinar_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  body text NOT NULL,
  upvotes integer NOT NULL DEFAULT 0,
  answered boolean NOT NULL DEFAULT false,
  answer text,
  dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_questions TO authenticated;
GRANT ALL ON public.webinar_questions TO service_role;
ALTER TABLE public.webinar_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa readable by room" ON public.webinar_questions FOR SELECT TO authenticated
  USING (public.is_webinar_registrant(auth.uid(), webinar_id) OR public.can_manage_webinar(auth.uid(), webinar_id));
CREATE POLICY "qa insert by room" ON public.webinar_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND (public.is_webinar_registrant(auth.uid(), webinar_id) OR public.can_manage_webinar(auth.uid(), webinar_id)));
CREATE POLICY "qa host update" ON public.webinar_questions FOR UPDATE TO authenticated
  USING (public.can_manage_webinar(auth.uid(), webinar_id))
  WITH CHECK (public.can_manage_webinar(auth.uid(), webinar_id));
CREATE POLICY "qa delete by host or author" ON public.webinar_questions FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_webinar(auth.uid(), webinar_id));

CREATE TABLE IF NOT EXISTS public.webinar_question_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.webinar_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.webinar_question_votes TO authenticated;
GRANT ALL ON public.webinar_question_votes TO service_role;
ALTER TABLE public.webinar_question_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes own" ON public.webinar_question_votes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_question_upvotes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.webinar_questions q
  SET upvotes = (SELECT count(*) FROM public.webinar_question_votes v WHERE v.question_id = q.id)
  WHERE q.id = COALESCE(NEW.question_id, OLD.question_id);
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_question_upvotes ON public.webinar_question_votes;
CREATE TRIGGER trg_sync_question_upvotes AFTER INSERT OR DELETE ON public.webinar_question_votes
FOR EACH ROW EXECUTE FUNCTION public.sync_question_upvotes();

-- 5. Polls
CREATE TABLE IF NOT EXISTS public.webinar_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  question text NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_polls TO authenticated;
GRANT ALL ON public.webinar_polls TO service_role;
ALTER TABLE public.webinar_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls readable by room" ON public.webinar_polls FOR SELECT TO authenticated
  USING (public.is_webinar_registrant(auth.uid(), webinar_id) OR public.can_manage_webinar(auth.uid(), webinar_id));
CREATE POLICY "polls host manage" ON public.webinar_polls FOR ALL TO authenticated
  USING (public.can_manage_webinar(auth.uid(), webinar_id))
  WITH CHECK (public.can_manage_webinar(auth.uid(), webinar_id));

CREATE TABLE IF NOT EXISTS public.webinar_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.webinar_polls(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.webinar_poll_votes TO authenticated;
GRANT ALL ON public.webinar_poll_votes TO service_role;
ALTER TABLE public.webinar_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll votes readable in room" ON public.webinar_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.webinar_polls p WHERE p.id = poll_id
    AND (public.is_webinar_registrant(auth.uid(), p.webinar_id) OR public.can_manage_webinar(auth.uid(), p.webinar_id))));
CREATE POLICY "poll votes own write" ON public.webinar_poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "poll votes own update" ON public.webinar_poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Handouts
CREATE TABLE IF NOT EXISTS public.webinar_handouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_handouts TO authenticated;
GRANT ALL ON public.webinar_handouts TO service_role;
ALTER TABLE public.webinar_handouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "handouts readable by room" ON public.webinar_handouts FOR SELECT TO authenticated
  USING (public.is_webinar_registrant(auth.uid(), webinar_id) OR public.can_manage_webinar(auth.uid(), webinar_id));
CREATE POLICY "handouts host manage" ON public.webinar_handouts FOR ALL TO authenticated
  USING (public.can_manage_webinar(auth.uid(), webinar_id))
  WITH CHECK (public.can_manage_webinar(auth.uid(), webinar_id));

-- 7. Automated email queue
CREATE TABLE IF NOT EXISTS public.webinar_email_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template text NOT NULL,
  send_after timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (webinar_id, user_id, template)
);
CREATE INDEX IF NOT EXISTS webinar_email_jobs_due ON public.webinar_email_jobs (status, send_after);
GRANT SELECT ON public.webinar_email_jobs TO authenticated;
GRANT ALL ON public.webinar_email_jobs TO service_role;
ALTER TABLE public.webinar_email_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email jobs visible to host and admin" ON public.webinar_email_jobs FOR SELECT TO authenticated
  USING (public.can_manage_webinar(auth.uid(), webinar_id));

-- 8. Registration with seat cap, approval mode and automated email schedule
CREATE OR REPLACE FUNCTION public.register_for_webinar(_webinar_id uuid, _answers jsonb DEFAULT '{}'::jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _uid uuid := auth.uid();
  _w public.webinars%ROWTYPE;
  _taken integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _w FROM public.webinars WHERE id = _webinar_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF EXISTS (SELECT 1 FROM public.webinar_registrations WHERE user_id = _uid AND webinar_id = _webinar_id) THEN
    RETURN true;
  END IF;

  IF _w.seat_cap IS NOT NULL THEN
    SELECT count(*) INTO _taken FROM public.webinar_registrations WHERE webinar_id = _webinar_id;
    IF _taken >= _w.seat_cap THEN RAISE EXCEPTION 'This session is full'; END IF;
  END IF;

  IF NOT _w.is_free AND _w.price_inr > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.user_id = _uid AND o.item_id = _webinar_id AND o.item_type = 'webinar' AND o.status = 'paid'
    ) THEN RAISE EXCEPTION 'Payment required for this session'; END IF;
  END IF;

  INSERT INTO public.webinar_registrations (user_id, webinar_id, answers)
  VALUES (_uid, _webinar_id, COALESCE(_answers, '{}'::jsonb))
  ON CONFLICT (user_id, webinar_id) DO NOTHING;

  UPDATE public.webinars SET registered_count = registered_count + 1 WHERE id = _webinar_id;

  INSERT INTO public.webinar_email_jobs (webinar_id, user_id, template, send_after) VALUES
    (_webinar_id, _uid, 'webinar-registration', now()),
    (_webinar_id, _uid, 'webinar-reminder-24h', _w.starts_at - interval '24 hours'),
    (_webinar_id, _uid, 'webinar-reminder-1h', _w.starts_at - interval '1 hour'),
    (_webinar_id, _uid, 'webinar-live-now', _w.starts_at),
    (_webinar_id, _uid, 'webinar-followup', _w.starts_at + (_w.duration_min || ' minutes')::interval + interval '30 minutes')
  ON CONFLICT (webinar_id, user_id, template) DO NOTHING;

  RETURN true;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_for_webinar(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_webinar(uuid, jsonb) TO authenticated, service_role;

-- 9. Presence heartbeat: server-side attendance from real time in the room
CREATE OR REPLACE FUNCTION public.webinar_heartbeat(_webinar_id uuid)
RETURNS TABLE(seconds_watched integer, is_attended boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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

  _delta := LEAST(60, GREATEST(0, COALESCE(EXTRACT(EPOCH FROM (now() - _r.last_seen_at))::int, 15)));
  _threshold := CEIL(_w.duration_min * 60 * (COALESCE(_w.attendance_threshold_pct, 80)::numeric / 100))::int;

  UPDATE public.webinar_registrations r
  SET attendance_seconds = LEAST(_w.duration_min * 60, r.attendance_seconds + _delta),
      attendance_minutes = LEAST(_w.duration_min, (LEAST(_w.duration_min * 60, r.attendance_seconds + _delta) / 60)),
      last_seen_at = now(),
      joined_at = COALESCE(r.joined_at, now()),
      attended = r.attended OR (LEAST(_w.duration_min * 60, r.attendance_seconds + _delta) >= _threshold)
  WHERE r.user_id = _uid AND r.webinar_id = _webinar_id
  RETURNING r.attendance_seconds, r.attended INTO seconds_watched, is_attended;

  RETURN NEXT;
END; $$;
REVOKE EXECUTE ON FUNCTION public.webinar_heartbeat(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webinar_heartbeat(uuid) TO authenticated, service_role;

-- 10. Per-session analytics for hosts and admins
CREATE OR REPLACE FUNCTION public.webinar_analytics(_webinar_id uuid)
RETURNS TABLE(
  registered integer, attended integer, live_now integer,
  avg_watch_min numeric, show_up_pct numeric,
  questions integer, chat_messages integer, cta_clicks integer,
  gross_inr integer, payout_inr integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    (SELECT count(*) FROM public.webinar_registrations r WHERE r.webinar_id = _webinar_id)::int,
    (SELECT count(*) FROM public.webinar_registrations r WHERE r.webinar_id = _webinar_id AND r.attended)::int,
    (SELECT count(*) FROM public.webinar_registrations r WHERE r.webinar_id = _webinar_id AND r.last_seen_at > now() - interval '2 minutes')::int,
    COALESCE((SELECT round(avg(r.attendance_seconds)/60.0, 1) FROM public.webinar_registrations r WHERE r.webinar_id = _webinar_id AND r.joined_at IS NOT NULL), 0),
    COALESCE((SELECT round(100.0 * count(*) FILTER (WHERE r.joined_at IS NOT NULL) / NULLIF(count(*), 0), 1) FROM public.webinar_registrations r WHERE r.webinar_id = _webinar_id), 0),
    (SELECT count(*) FROM public.webinar_questions q WHERE q.webinar_id = _webinar_id)::int,
    (SELECT count(*) FROM public.webinar_chat c WHERE c.webinar_id = _webinar_id)::int,
    COALESCE((SELECT sum(r.cta_clicks) FROM public.webinar_registrations r WHERE r.webinar_id = _webinar_id), 0)::int,
    COALESCE((SELECT sum(o.amount_inr) FROM public.orders o WHERE o.item_id = _webinar_id AND o.item_type = 'webinar' AND o.status = 'paid'), 0)::int,
    COALESCE((SELECT sum(rs.payout_inr) FROM public.revenue_shares rs JOIN public.orders o ON o.id = rs.order_id
              WHERE o.item_id = _webinar_id AND o.item_type = 'webinar'), 0)::int
  WHERE public.can_manage_webinar(auth.uid(), _webinar_id)
$$;
REVOKE EXECUTE ON FUNCTION public.webinar_analytics(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webinar_analytics(uuid) TO authenticated, service_role;

-- 11. Attendee roster for hosts (CSV export)
CREATE OR REPLACE FUNCTION public.webinar_attendees(_webinar_id uuid)
RETURNS TABLE(full_name text, school_name text, city text, attended boolean, attendance_minutes integer, joined_at timestamptz, registered_at timestamptz, answers jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(p.full_name, 'Member'), p.school_name, p.city,
         r.attended, r.attendance_minutes, r.joined_at, r.created_at, r.answers
  FROM public.webinar_registrations r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  WHERE r.webinar_id = _webinar_id
    AND public.can_manage_webinar(auth.uid(), _webinar_id)
  ORDER BY r.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.webinar_attendees(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.webinar_attendees(uuid) TO authenticated, service_role;

-- 12. CTA click tracking
CREATE OR REPLACE FUNCTION public.record_webinar_cta_click(_webinar_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.webinar_registrations SET cta_clicks = cta_clicks + 1
  WHERE webinar_id = _webinar_id AND user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.record_webinar_cta_click(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_webinar_cta_click(uuid) TO authenticated, service_role;

-- 13. Only admins may change a session's approval state
CREATE OR REPLACE FUNCTION public.protect_webinar_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.approval_status := OLD.approval_status;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_webinar_approval ON public.webinars;
CREATE TRIGGER trg_protect_webinar_approval BEFORE UPDATE ON public.webinars
FOR EACH ROW EXECUTE FUNCTION public.protect_webinar_approval();

-- 14. New sessions from resource principals need admin approval
UPDATE public.webinars SET approval_status = 'approved' WHERE approval_status IS NULL OR approval_status = 'pending';
ALTER TABLE public.webinars ALTER COLUMN approval_status SET DEFAULT 'pending';

-- 15. Realtime for the live room
ALTER TABLE public.webinar_chat REPLICA IDENTITY FULL;
ALTER TABLE public.webinar_questions REPLICA IDENTITY FULL;
ALTER TABLE public.webinar_polls REPLICA IDENTITY FULL;
ALTER TABLE public.webinar_poll_votes REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.webinar_chat;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.webinar_questions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.webinar_polls;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.webinar_poll_votes;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;