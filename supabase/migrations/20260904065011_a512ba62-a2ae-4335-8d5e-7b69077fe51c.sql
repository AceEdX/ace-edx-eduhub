-- lovable-cron-fallback-reviewed: 96 runs/day; time-based reminders (1h-before / live-now) need ≤15 min delivery precision and no event triggers them
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'webinar-email-dispatch') THEN
    PERFORM cron.unschedule('webinar-email-dispatch');
  END IF;
END $$;

SELECT cron.schedule(
  'webinar-email-dispatch',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://eduhub.aceedx.com/api/public/webinar-reminders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);