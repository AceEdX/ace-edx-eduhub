ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  to_number text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text,
  status text NOT NULL DEFAULT 'queued',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "admins read whatsapp messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));