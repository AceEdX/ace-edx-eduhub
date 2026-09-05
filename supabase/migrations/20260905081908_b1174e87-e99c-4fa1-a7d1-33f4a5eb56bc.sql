-- Registrants keep lifetime read access to webinars they registered/paid for, even if hidden later
CREATE POLICY "registrants read own webinars"
ON public.webinars FOR SELECT TO authenticated
USING (public.is_webinar_registrant(auth.uid(), id));

-- Enrolled learners keep lifetime read access to courses they enrolled in
CREATE POLICY "enrolled read own courses"
ON public.courses FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = courses.id AND e.user_id = auth.uid()));

-- Enrolled learners keep access to lessons even if the course is later unpublished
CREATE POLICY "enrolled read lessons lifetime"
ON public.lessons FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = lessons.course_id AND e.user_id = auth.uid()));