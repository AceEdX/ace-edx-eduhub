-- Anon-safe public read policies (has_role is not executable by anon)
DROP POLICY IF EXISTS "courses public read" ON public.courses;
CREATE POLICY "courses public read anon" ON public.courses FOR SELECT TO anon USING (published);
CREATE POLICY "courses read authenticated" ON public.courses FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "webinars public read" ON public.webinars;
CREATE POLICY "webinars public read anon" ON public.webinars FOR SELECT TO anon USING (published);
CREATE POLICY "webinars read authenticated" ON public.webinars FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "published media readable" ON public.media_assets;
CREATE POLICY "media public read anon" ON public.media_assets FOR SELECT TO anon USING (published);
CREATE POLICY "media read authenticated" ON public.media_assets FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "published paths readable" ON public.learning_paths;
CREATE POLICY "paths public read anon" ON public.learning_paths FOR SELECT TO anon USING (published);
CREATE POLICY "paths read authenticated" ON public.learning_paths FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "path items readable" ON public.learning_path_items;
CREATE POLICY "path items public read anon" ON public.learning_path_items FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND p.published));
CREATE POLICY "path items read authenticated" ON public.learning_path_items FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.learning_paths p WHERE p.id = path_id AND (p.published OR public.has_role(auth.uid(),'admin'))));

DROP POLICY IF EXISTS "lessons entitled read" ON public.lessons;
CREATE POLICY "lessons free read anon" ON public.lessons FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.published AND c.is_free));
CREATE POLICY "lessons entitled read authenticated" ON public.lessons FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = course_id AND c.published AND (
      c.is_free OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id AND e.user_id = auth.uid())
    )
  ) OR public.has_role(auth.uid(),'admin')
);

DROP POLICY IF EXISTS "resource principals public read" ON public.resource_principals;
CREATE POLICY "principals public read anon" ON public.resource_principals FOR SELECT TO anon USING (status = 'active');
CREATE POLICY "principals read authenticated" ON public.resource_principals FOR SELECT TO authenticated
USING (status = 'active' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "active plans readable" ON public.subscription_plans;
CREATE POLICY "plans public read anon" ON public.subscription_plans FOR SELECT TO anon USING (active);
CREATE POLICY "plans read authenticated" ON public.subscription_plans FOR SELECT TO authenticated
USING (active OR public.has_role(auth.uid(),'admin'));

-- Admins can manage member profiles (for verification review)
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update profiles" ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Ensure admins can insert/update verification records for any member
DROP POLICY IF EXISTS "admins manage verifications" ON public.school_verifications;
CREATE POLICY "admins manage verifications" ON public.school_verifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));