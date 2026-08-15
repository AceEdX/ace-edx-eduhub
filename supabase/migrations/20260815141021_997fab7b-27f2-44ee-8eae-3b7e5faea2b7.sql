
-- AI ---------------------------------------------------------------
CREATE TABLE public.ai_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  prompt text NOT NULL,
  output text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;
ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai generations" ON public.ai_generations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "insert own ai generations" ON public.ai_generations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own ai generations" ON public.ai_generations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Media -------------------------------------------------------------
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  media_type text NOT NULL DEFAULT 'video',
  url text NOT NULL,
  thumbnail_url text,
  duration_sec integer NOT NULL DEFAULT 0,
  tags text[] NOT NULL DEFAULT '{}',
  transcript text,
  published boolean NOT NULL DEFAULT true,
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.media_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_assets TO authenticated;
GRANT ALL ON public.media_assets TO service_role;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published media readable" ON public.media_assets FOR SELECT
  USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage media" ON public.media_assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER media_assets_updated BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.social_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid REFERENCES public.media_assets(id) ON DELETE SET NULL,
  channel text NOT NULL,
  caption text NOT NULL,
  link_url text,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft',
  published_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_publications TO authenticated;
GRANT ALL ON public.social_publications TO service_role;
ALTER TABLE public.social_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage publications" ON public.social_publications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER social_publications_updated BEFORE UPDATE ON public.social_publications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Monetization -------------------------------------------------------
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value integer NOT NULL DEFAULT 10,
  applies_to text NOT NULL DEFAULT 'all',
  max_redemptions integer,
  redemptions integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active coupons readable" ON public.coupons FOR SELECT TO authenticated
  USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_inr integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_inr integer NOT NULL DEFAULT 0;

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  price_inr integer NOT NULL DEFAULT 0,
  interval_months integer NOT NULL DEFAULT 12,
  features text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_plans TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active plans readable" ON public.subscription_plans FOR SELECT
  USING (active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscription_plans_updated BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own subscriptions" ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.revenue_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id uuid NOT NULL REFERENCES public.resource_principals(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  item_title text NOT NULL,
  gross_inr integer NOT NULL DEFAULT 0,
  share_pct integer NOT NULL DEFAULT 0,
  payout_inr integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.revenue_shares TO authenticated;
GRANT ALL ON public.revenue_shares TO service_role;
ALTER TABLE public.revenue_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "principal or admin reads shares" ON public.revenue_shares FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.resource_principals rp
    WHERE rp.id = principal_id AND rp.user_id = auth.uid()));
CREATE POLICY "admins manage shares" ON public.revenue_shares FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER revenue_shares_updated BEFORE UPDATE ON public.revenue_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Advanced ------------------------------------------------------------
CREATE TABLE public.sponsorships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  phone text,
  package_type text NOT NULL DEFAULT 'webinar',
  budget_inr integer,
  message text,
  status text NOT NULL DEFAULT 'new',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sponsorships TO authenticated;
GRANT INSERT ON public.sponsorships TO anon;
GRANT ALL ON public.sponsorships TO service_role;
ALTER TABLE public.sponsorships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can enquire" ON public.sponsorships FOR INSERT WITH CHECK (true);
CREATE POLICY "own or admin sponsorships" ON public.sponsorships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update sponsorships" ON public.sponsorships FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER sponsorships_updated BEFORE UPDATE ON public.sponsorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.speaker_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  principal_id uuid REFERENCES public.resource_principals(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  event_date date,
  event_format text NOT NULL DEFAULT 'online',
  city text,
  audience_size integer,
  topic text NOT NULL,
  budget_inr integer,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.speaker_requests TO authenticated;
GRANT ALL ON public.speaker_requests TO service_role;
ALTER TABLE public.speaker_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "create speaker requests" ON public.speaker_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());
CREATE POLICY "read own or related speaker requests" ON public.speaker_requests FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.resource_principals rp
    WHERE rp.id = principal_id AND rp.user_id = auth.uid()));
CREATE POLICY "admin or principal updates speaker requests" ON public.speaker_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.resource_principals rp
    WHERE rp.id = principal_id AND rp.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.resource_principals rp
    WHERE rp.id = principal_id AND rp.user_id = auth.uid()));
CREATE TRIGGER speaker_requests_updated BEFORE UPDATE ON public.speaker_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  audience text,
  level text NOT NULL DEFAULT 'All levels',
  image_url text,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_paths TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_paths TO authenticated;
GRANT ALL ON public.learning_paths TO service_role;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published paths readable" ON public.learning_paths FOR SELECT
  USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage paths" ON public.learning_paths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER learning_paths_updated BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.learning_path_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 1,
  item_type text NOT NULL DEFAULT 'course',
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  webinar_id uuid REFERENCES public.webinars(id) ON DELETE CASCADE,
  resource_id uuid REFERENCES public.resources(id) ON DELETE CASCADE,
  label text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.learning_path_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_path_items TO authenticated;
GRANT ALL ON public.learning_path_items TO service_role;
ALTER TABLE public.learning_path_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "path items readable" ON public.learning_path_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND (p.published OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "admins manage path items" ON public.learning_path_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.learning_path_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_id)
);
GRANT SELECT, INSERT, DELETE ON public.learning_path_enrollments TO authenticated;
GRANT ALL ON public.learning_path_enrollments TO service_role;
ALTER TABLE public.learning_path_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own path enrollment" ON public.learning_path_enrollments FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Seed plans -----------------------------------------------------------
INSERT INTO public.subscription_plans (slug, name, tagline, price_inr, interval_months, features, sort_order) VALUES
('principal-free','Community','Join the principal network and learn in public',0,12,
  ARRAY['Community feed and peer groups','Free webinars and recordings','Public resource library'],1),
('principal-pro','PrincipalX Pro','Everything a school leader needs, all year',4999,12,
  ARRAY['All masterclasses and workshops','Full course library','Premium toolkits and templates','Verified certificates','Priority speaker matching'],2),
('principal-institution','Institution','For leadership teams and school groups',24999,12,
  ARRAY['Up to 10 leader seats','Custom in-school workshops','Institution analytics','Dedicated success partner'],3);
