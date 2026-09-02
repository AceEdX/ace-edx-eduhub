REVOKE EXECUTE ON FUNCTION public.protect_profile_verification_status() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_webinar_approval() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_question_upvotes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_resource_principal_from_application() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_webinar_registered_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.webinars w
  SET registered_count = (SELECT count(*) FROM public.webinar_registrations r WHERE r.webinar_id = w.id)
  WHERE w.id = COALESCE(NEW.webinar_id, OLD.webinar_id);
  RETURN NULL;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_webinar_registered_count() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_sync_webinar_registered_count ON public.webinar_registrations;
CREATE TRIGGER trg_sync_webinar_registered_count AFTER INSERT OR DELETE ON public.webinar_registrations
FOR EACH ROW EXECUTE FUNCTION public.sync_webinar_registered_count();

UPDATE public.webinars w
SET registered_count = (SELECT count(*) FROM public.webinar_registrations r WHERE r.webinar_id = w.id);

-- register_for_webinar no longer increments manually (trigger handles it)
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

  INSERT INTO public.webinar_email_jobs (webinar_id, user_id, template, send_after) VALUES
    (_webinar_id, _uid, 'webinar-registration', now()),
    (_webinar_id, _uid, 'webinar-reminder-24h', _w.starts_at - interval '24 hours'),
    (_webinar_id, _uid, 'webinar-reminder-1h', _w.starts_at - interval '1 hour'),
    (_webinar_id, _uid, 'webinar-live-now', _w.starts_at),
    (_webinar_id, _uid, 'webinar-followup', _w.starts_at + (_w.duration_min || ' minutes')::interval + interval '30 minutes')
  ON CONFLICT (webinar_id, user_id, template) DO NOTHING;

  RETURN true;
END; $$;