
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','expert','member','institution_admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  professional_role text,
  school_name text,
  city text,
  country text,
  years_in_education int,
  interests text[] NOT NULL DEFAULT '{}',
  avatar_url text,
  bio text,
  visibility text NOT NULL DEFAULT 'public',
  onboarding_complete boolean NOT NULL DEFAULT false,
  learning_hours numeric NOT NULL DEFAULT 0,
  streak_days int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public profiles readable" ON public.profiles FOR SELECT USING (visibility = 'public' OR auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'member') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- EXPERTS
CREATE TABLE public.experts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  title text,
  organisation text,
  country text,
  bio text,
  expertise text[] NOT NULL DEFAULT '{}',
  photo_url text,
  rating numeric NOT NULL DEFAULT 4.8,
  courses_count int NOT NULL DEFAULT 0,
  webinars_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.experts TO anon, authenticated;
GRANT ALL ON public.experts TO service_role;
ALTER TABLE public.experts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "experts public read" ON public.experts FOR SELECT USING (true);
CREATE POLICY "admins manage experts" ON public.experts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COURSES
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
  description text,
  topic text NOT NULL DEFAULT 'Leadership',
  level text NOT NULL DEFAULT 'Intermediate',
  duration_hours numeric NOT NULL DEFAULT 4,
  language text NOT NULL DEFAULT 'English',
  price_inr int NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  certificate boolean NOT NULL DEFAULT true,
  rating numeric NOT NULL DEFAULT 4.7,
  learners int NOT NULL DEFAULT 0,
  image_url text,
  outcomes text[] NOT NULL DEFAULT '{}',
  audience text[] NOT NULL DEFAULT '{}',
  expert_id uuid REFERENCES public.experts(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses public read" ON public.courses FOR SELECT USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage courses" ON public.courses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_title text NOT NULL,
  module_order int NOT NULL DEFAULT 1,
  title text NOT NULL,
  lesson_order int NOT NULL DEFAULT 1,
  kind text NOT NULL DEFAULT 'video',
  duration_min int NOT NULL DEFAULT 10,
  content text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lessons_course_idx ON public.lessons(course_id, module_order, lesson_order);
GRANT SELECT ON public.lessons TO anon, authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons public read" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "admins manage lessons" ON public.lessons FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own enrollments" ON public.enrollments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lesson progress" ON public.lesson_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WEBINARS
CREATE TABLE public.webinars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  topic text NOT NULL DEFAULT 'Leadership',
  starts_at timestamptz NOT NULL,
  duration_min int NOT NULL DEFAULT 60,
  price_inr int NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'upcoming',
  certificate boolean NOT NULL DEFAULT true,
  meeting_url text,
  recording_url text,
  image_url text,
  registered_count int NOT NULL DEFAULT 0,
  expert_id uuid REFERENCES public.experts(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.webinars TO anon, authenticated;
GRANT ALL ON public.webinars TO service_role;
ALTER TABLE public.webinars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webinars public read" ON public.webinars FOR SELECT USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage webinars" ON public.webinars FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  webinar_id uuid NOT NULL REFERENCES public.webinars(id) ON DELETE CASCADE,
  attended boolean NOT NULL DEFAULT false,
  attendance_minutes int NOT NULL DEFAULT 0,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, webinar_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webinar_registrations TO authenticated;
GRANT ALL ON public.webinar_registrations TO service_role;
ALTER TABLE public.webinar_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own registrations" ON public.webinar_registrations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- CERTIFICATES
CREATE SEQUENCE public.certificate_seq START 184;
CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id text UNIQUE NOT NULL DEFAULT ('ACE-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.certificate_seq')::text, 6, '0')),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text NOT NULL,
  kind text NOT NULL DEFAULT 'course',
  title text NOT NULL,
  issuer text NOT NULL DEFAULT 'AceEdX',
  speaker text,
  duration_text text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked boolean NOT NULL DEFAULT false,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  webinar_id uuid REFERENCES public.webinars(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT ON public.certificates TO authenticated;
GRANT SELECT ON public.certificates TO anon;
GRANT ALL ON public.certificates TO service_role;
GRANT USAGE ON SEQUENCE public.certificate_seq TO anon, authenticated, service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certificates verifiable" ON public.certificates FOR SELECT USING (true);
CREATE POLICY "own certificate insert" ON public.certificates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage certificates" ON public.certificates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- COMMUNITY
CREATE TABLE public.community_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  members_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_groups TO anon, authenticated;
GRANT ALL ON public.community_groups TO service_role;
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups public read" ON public.community_groups FOR SELECT USING (true);
CREATE POLICY "admins manage groups" ON public.community_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.community_groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own memberships" ON public.group_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'AceEdX Member',
  author_role text,
  group_id uuid REFERENCES public.community_groups(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'discussion',
  title text,
  body text NOT NULL,
  topic text,
  views int NOT NULL DEFAULT 0,
  reactions int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts public read" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "own posts write" ON public.community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own posts update" ON public.community_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own posts delete" ON public.community_posts FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT 'AceEdX Member',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments public read" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "own comments write" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own comments delete" ON public.community_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- RESOURCES
CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'School Leadership',
  resource_type text NOT NULL DEFAULT 'Template',
  is_toolkit boolean NOT NULL DEFAULT false,
  is_free boolean NOT NULL DEFAULT true,
  downloads int NOT NULL DEFAULT 0,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources public read" ON public.resources FOR SELECT USING (true);
CREATE POLICY "admins manage resources" ON public.resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS (payments)
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  item_id uuid,
  item_title text NOT NULL,
  amount_inr int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'razorpay',
  provider_order_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders" ON public.orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SEED EXPERTS
INSERT INTO public.experts (slug,name,title,organisation,country,bio,expertise,rating,courses_count,webinars_count) VALUES
('dr-anita-rao','Dr. Anita Rao','Former Principal & Leadership Coach','Bloomfield International School','India','Anita has led three K-12 schools through turnaround programmes and now coaches over 400 principals across South Asia on instructional leadership.','{"School Leadership","Instructional Leadership","Teacher Coaching"}',4.9,4,12),
('james-okoro','James Okoro','Head of School','Lagos Global Academy','Nigeria','James specialises in school culture and staff retention, having reduced teacher attrition by 40% across a five-school network.','{"School Culture","HR","Staff Retention"}',4.8,3,9),
('meera-krishnan','Meera Krishnan','Academic Director','Curriculum Futures Institute','India','Meera designs curriculum transformation programmes for CBSE, ICSE and IB schools and advises boards on assessment reform.','{"Curriculum","Assessment","IB"}',4.9,5,14),
('dr-samuel-adeyemi','Dr. Samuel Adeyemi','Professor of Education Policy','University of Cape Town','South Africa','Samuel researches school accountability systems and translates policy into practical school-level playbooks.','{"Education Policy","Governance","School Improvement"}',4.7,2,7),
('priya-nair','Priya Nair','AI in Education Lead','EdTech Collaborative','Singapore','Priya helps schools build responsible AI policies and train teachers in practical classroom AI use.','{"AI in Education","EdTech","Digital Safety"}',4.9,3,18),
('robert-lindqvist','Robert Lindqvist','School Owner & Strategist','Nordic Learning Group','Sweden','Robert has grown a group of independent schools from 2 to 11 campuses and mentors school owners on growth strategy.','{"School Growth","Finance","Admissions"}',4.6,2,6),
('fatima-al-hassan','Fatima Al-Hassan','Student Wellbeing Director','Gulf International Schools','UAE','Fatima built a wellbeing framework now used by 60+ schools, focused on early identification and staff capacity.','{"Student Wellbeing","Safeguarding","Pastoral Care"}',4.9,3,11),
('daniel-mercer','Daniel Mercer','Vice Principal & Data Coach','Westbridge Academy','United Kingdom','Daniel trains leadership teams to use school data without drowning in dashboards.','{"Data-Driven Leadership","Assessment","School Operations"}',4.7,2,8),
('sunita-desai','Sunita Desai','Parent Engagement Consultant','Bridge Partners Education','India','Sunita works with schools on parent communication systems and community trust-building.','{"Parent Engagement","Communication","Admissions"}',4.8,2,10),
('carlos-mendes','Carlos Mendes','Director of Innovation','Escola Futura','Brazil','Carlos leads future-skills programmes and school innovation labs across Latin America.','{"Innovation","Future Skills","EdTech"}',4.8,3,9);

-- SEED COURSES
INSERT INTO public.courses (slug,title,summary,description,topic,level,duration_hours,price_inr,is_free,rating,learners,outcomes,audience,expert_id) VALUES
('ai-for-school-leaders','AI for School Leaders','Build a responsible, practical AI strategy for your school.','A hands-on programme covering AI literacy for leadership teams, academic integrity, staff training and writing your school AI policy.','AI in Education','Beginner',6,0,true,4.9,3820,'{"Write a school-wide AI policy","Protect academic integrity","Train staff on practical AI use","Evaluate AI tools safely"}','{"Principal","Academic Coordinator","Director"}',(SELECT id FROM public.experts WHERE slug='priya-nair')),
('leading-high-performance-teacher-teams','Leading High-Performance Teacher Teams','Turn departments into genuinely collaborative teams.','Practical routines for team leadership: clarity of purpose, feedback cycles, distributed leadership and accountability without fear.','Teacher Development','Intermediate',8,2999,false,4.8,2140,'{"Design effective team routines","Run useful feedback conversations","Distribute leadership safely"}','{"Principal","Vice Principal","Head of Department"}',(SELECT id FROM public.experts WHERE slug='dr-anita-rao')),
('building-positive-school-culture','Building a Positive School Culture','Culture is what happens when you are not in the room.','Diagnose your current culture, design rituals that matter, and rebuild staff trust with evidence-based practices.','School Leadership','Intermediate',7,2499,false,4.9,1890,'{"Diagnose school culture","Design meaningful rituals","Rebuild staff trust"}','{"Principal","Head of School"}',(SELECT id FROM public.experts WHERE slug='james-okoro')),
('principals-first-100-days','The Principal''s First 100 Days','A structured plan for your first 100 days in post.','Week-by-week guidance for new principals: listening tours, quick wins, stakeholder mapping and the first strategic plan.','School Leadership','Beginner',5,0,true,4.9,4610,'{"Run a structured listening phase","Identify credible quick wins","Publish a 100-day plan"}','{"Principal","Vice Principal","Head of School"}',(SELECT id FROM public.experts WHERE slug='dr-anita-rao')),
('effective-school-improvement-planning','Effective School Improvement Planning','Write a school improvement plan people actually use.','From self-evaluation to measurable priorities, milestones and monitoring routines that survive the school year.','School Improvement','Intermediate',6,2499,false,4.7,1450,'{"Complete a school self-evaluation","Set three measurable priorities","Build a monitoring rhythm"}','{"Principal","Director","Academic Coordinator"}',(SELECT id FROM public.experts WHERE slug='dr-samuel-adeyemi')),
('student-wellbeing-leadership','Student Wellbeing Leadership','Lead wellbeing as a system, not a campaign.','Build a whole-school wellbeing framework: early identification, referral pathways, staff capacity and measurable outcomes.','Student Wellbeing','Intermediate',6,1999,false,4.9,2310,'{"Map referral pathways","Train staff in early identification","Measure wellbeing outcomes"}','{"Principal","Vice Principal","Counsellor"}',(SELECT id FROM public.experts WHERE slug='fatima-al-hassan')),
('data-driven-school-leadership','Data-Driven School Leadership','Use the five numbers that actually change decisions.','Cut through dashboards. Learn which data matters, how to read it honestly, and how to lead conversations with evidence.','Assessment','Advanced',7,2999,false,4.7,980,'{"Select high-signal metrics","Run data conversations with staff","Avoid common data traps"}','{"Principal","Academic Coordinator","Vice Principal"}',(SELECT id FROM public.experts WHERE slug='daniel-mercer')),
('parent-engagement-strategies','Parent Engagement Strategies','Move from newsletters to real partnership.','Communication systems, difficult parent conversations, community events and measuring parental trust.','Parent Engagement','Beginner',4,0,true,4.6,2760,'{"Design a parent communication system","Handle difficult conversations","Measure parent trust"}','{"Principal","Vice Principal","Admissions Lead"}',(SELECT id FROM public.experts WHERE slug='sunita-desai')),
('leading-curriculum-transformation','Leading Curriculum Transformation','Redesign curriculum without losing your teachers.','A change-management approach to curriculum reform across CBSE, ICSE, IB and national frameworks.','Curriculum','Advanced',9,3999,false,4.8,1120,'{"Audit your current curriculum","Sequence a multi-year redesign","Bring teachers with you"}','{"Academic Coordinator","Principal","Director"}',(SELECT id FROM public.experts WHERE slug='meera-krishnan')),
('education-technology-for-principals','Education Technology for Principals','Buy less. Use more. Measure everything.','An evaluation framework for edtech procurement, rollout, teacher adoption and impact measurement.','EdTech','Beginner',5,1499,false,4.6,1640,'{"Evaluate edtech purchases","Plan a realistic rollout","Measure adoption and impact"}','{"Principal","Director","IT Lead"}',(SELECT id FROM public.experts WHERE slug='carlos-mendes')),
('managing-difficult-conversations','Managing Difficult Conversations','The conversations leaders avoid cost the most.','Scripts, structures and practice for underperformance, conflict, parent complaints and staff grievances.','Leadership','Intermediate',4,1999,false,4.9,3050,'{"Prepare a difficult conversation","Stay calm under pressure","Close with clear commitments"}','{"Principal","Vice Principal","Academic Coordinator"}',(SELECT id FROM public.experts WHERE slug='dr-anita-rao')),
('teacher-coaching-and-mentoring','Teacher Coaching & Mentoring','Observation that improves teaching, not paperwork.','Build a coaching culture: low-stakes observation, precise feedback, mentoring structures and growth plans.','Teacher Development','Intermediate',6,2499,false,4.8,1730,'{"Run low-stakes observations","Give precise, usable feedback","Set teacher growth plans"}','{"Academic Coordinator","Principal","Head of Department"}',(SELECT id FROM public.experts WHERE slug='meera-krishnan')),
('future-ready-schools','Future-Ready Schools','Prepare your school for the next decade, not the last one.','Future skills, flexible spaces, competency assessment and building innovation capacity in staff.','Innovation','Advanced',7,2999,false,4.7,860,'{"Define future skills for your context","Pilot competency assessment","Build staff innovation capacity"}','{"Director","Principal","School Owner"}',(SELECT id FROM public.experts WHERE slug='carlos-mendes')),
('school-marketing-and-admissions','School Marketing & Admissions','Fill your seats with families who fit.','Positioning, enquiry funnels, tour experience, conversion and retention for independent and private schools.','Admissions','Intermediate',5,3499,false,4.6,940,'{"Define your school positioning","Build an enquiry funnel","Improve tour conversion"}','{"School Owner","Director","Admissions Lead"}',(SELECT id FROM public.experts WHERE slug='robert-lindqvist')),
('strategic-leadership-for-school-owners','Strategic Leadership for School Owners','Run the school as a mission-driven business.','Governance, finance, expansion, risk and leadership succession for owners and directors of school groups.','Governance','Advanced',10,4999,false,4.8,620,'{"Build a three-year growth plan","Strengthen governance","Plan leadership succession"}','{"School Owner","Director","Board Member"}',(SELECT id FROM public.experts WHERE slug='robert-lindqvist'));

-- SEED LESSONS for every course (4 modules + assessment)
INSERT INTO public.lessons (course_id, module_title, module_order, title, lesson_order, kind, duration_min, content)
SELECT c.id, m.mt, m.mo, m.lt, m.lo, m.k, m.d,
  'In this lesson we work through ' || m.lt || ' in the context of ' || c.title || '. Use the workbook alongside the video and bring one real example from your own school.'
FROM public.courses c
CROSS JOIN (VALUES
  ('Module 1 · Foundations',1,'Why this matters for your school',1,'video',12),
  ('Module 1 · Foundations',1,'Diagnosing where you are today',2,'video',15),
  ('Module 2 · Frameworks',2,'The core framework explained',1,'video',18),
  ('Module 2 · Frameworks',2,'Case study: a school that got it right',2,'text',10),
  ('Module 3 · Practice',3,'Putting it to work on Monday',1,'video',20),
  ('Module 3 · Practice',3,'Templates and planning workshop',2,'text',15),
  ('Module 4 · Leading Change',4,'Bringing your team with you',1,'video',16),
  ('Module 4 · Leading Change',4,'Measuring impact over a term',2,'video',14),
  ('Final Assessment',5,'Final assessment',1,'quiz',20)
) AS m(mt,mo,lt,lo,k,d);

-- SEED WEBINARS
INSERT INTO public.webinars (slug,title,description,topic,starts_at,duration_min,price_inr,is_free,status,expert_id,registered_count) VALUES
('ai-academic-integrity','AI and Academic Integrity: What Schools Must Decide Now','A practical session on assessment redesign in the age of generative AI.','AI in Education',now()+interval '4 days',60,0,true,'upcoming',(SELECT id FROM public.experts WHERE slug='priya-nair'),842),
('teacher-burnout-clinic','The Teacher Burnout Clinic','Diagnose the real drivers of burnout in your school and what leaders can change.','Teacher Development',now()+interval '8 days',75,499,false,'upcoming',(SELECT id FROM public.experts WHERE slug='james-okoro'),318),
('first-term-as-principal','Your First Term as Principal','Live Q&A for newly appointed school leaders.','School Leadership',now()+interval '11 days',60,0,true,'upcoming',(SELECT id FROM public.experts WHERE slug='dr-anita-rao'),1204),
('assessment-reform-live','Assessment Reform Without Chaos','How to move to competency-based assessment across a whole school.','Assessment',now()+interval '15 days',90,799,false,'upcoming',(SELECT id FROM public.experts WHERE slug='meera-krishnan'),265),
('wellbeing-early-warning','Building a Wellbeing Early-Warning System','Spot student distress before it escalates.','Student Wellbeing',now()+interval '18 days',60,0,true,'upcoming',(SELECT id FROM public.experts WHERE slug='fatima-al-hassan'),689),
('admissions-masterclass','Admissions Masterclass for School Owners','Fill your seats with the right families.','Admissions',now()+interval '22 days',90,999,false,'upcoming',(SELECT id FROM public.experts WHERE slug='robert-lindqvist'),173),
('data-that-matters','The Five Numbers Every Principal Should Watch','Cut your dashboard down to what changes decisions.','Assessment',now()+interval '26 days',60,0,true,'upcoming',(SELECT id FROM public.experts WHERE slug='daniel-mercer'),455),
('parent-trust','Rebuilding Parent Trust After a Difficult Year','Communication strategies that repair relationships.','Parent Engagement',now()+interval '30 days',60,499,false,'upcoming',(SELECT id FROM public.experts WHERE slug='sunita-desai'),221),
('governance-essentials','Governance Essentials for School Boards','What good governance looks like in practice.','Governance',now()+interval '34 days',75,799,false,'upcoming',(SELECT id FROM public.experts WHERE slug='dr-samuel-adeyemi'),142),
('future-skills-live','Future Skills: What to Teach When Nobody Knows','Designing a curriculum for uncertainty.','Innovation',now()+interval '38 days',60,0,true,'upcoming',(SELECT id FROM public.experts WHERE slug='carlos-mendes'),512),
('classroom-observation-recording','Classroom Observation That Teachers Welcome','Recorded session on low-stakes observation cycles.','Teacher Development',now()-interval '12 days',65,0,true,'recorded',(SELECT id FROM public.experts WHERE slug='meera-krishnan'),1890),
('school-culture-recording','Fixing a Broken Staffroom','Recorded session on staff culture repair.','School Leadership',now()-interval '20 days',70,499,false,'recorded',(SELECT id FROM public.experts WHERE slug='james-okoro'),1345),
('ai-policy-workshop-recording','Writing Your School AI Policy: Workshop Replay','Full workshop replay with downloadable policy template.','AI in Education',now()-interval '28 days',95,799,false,'recorded',(SELECT id FROM public.experts WHERE slug='priya-nair'),2410),
('difficult-conversations-recording','Three Conversations Leaders Avoid','Recorded masterclass with role-play examples.','Leadership',now()-interval '35 days',60,0,true,'recorded',(SELECT id FROM public.experts WHERE slug='dr-anita-rao'),1720),
('school-growth-recording','Scaling From One Campus to Five','Recorded session for school owners.','School Growth',now()-interval '45 days',80,999,false,'recorded',(SELECT id FROM public.experts WHERE slug='robert-lindqvist'),760);

-- SEED GROUPS
INSERT INTO public.community_groups (slug,name,description,members_count) VALUES
('principals','Principals Community','Peer support and practical problem-solving for serving principals.',4210),
('school-owners','School Owners Network','Strategy, growth and governance for owners and directors.',980),
('academic-coordinators','Academic Coordinators','Curriculum, assessment and instructional leadership.',2340),
('international-schools','International Schools','Leaders working in international contexts.',1560),
('cbse-leaders','CBSE School Leaders','Board-specific practice and compliance.',3120),
('icse-leaders','ICSE School Leaders','Board-specific practice and compliance.',1240),
('ib-leaders','IB School Leaders','PYP, MYP and DP leadership.',890),
('india-leaders','School Leaders – India','National policy, NEP and local practice.',5120),
('global-leaders','School Leaders – Global','Cross-border conversations and comparison.',2870),
('ai-education','AI in Education','Responsible, practical AI in schools.',3980),
('school-operations','School Operations','Timetabling, transport, facilities and safety.',1420),
('student-wellbeing','Student Wellbeing','Pastoral care, safeguarding and mental health.',2650);

-- SEED DISCUSSIONS
INSERT INTO public.community_posts (author_name,author_role,kind,title,body,topic,views,reactions,group_id) VALUES
('Ravi Menon','Principal, Bengaluru','question','How are schools using AI without compromising academic integrity?','We have banned AI for coursework but that feels like a losing battle. Curious what assessment changes others have actually made rather than policing tools.','AI in Education',3820,164,(SELECT id FROM public.community_groups WHERE slug='ai-education')),
('Grace Adeyinka','Head of School, Lagos','question','What is the best way to handle teacher burnout?','Three strong teachers resigned this term citing workload. Before I redesign the timetable, what have you found actually moves the needle?','Teacher Development',2910,132,(SELECT id FROM public.community_groups WHERE slug='principals')),
('Nisha Verma','Vice Principal, Pune','question','How do you improve parent engagement beyond WhatsApp groups?','Our parent groups are noisy but engagement at events is low. What formats have worked for you?','Parent Engagement',2140,98,(SELECT id FROM public.community_groups WHERE slug='india-leaders')),
('Thomas Baker','Principal, Manchester','discussion','What is the biggest leadership challenge your school is facing this year?','For us it is recruitment. Two maths posts unfilled since August. Interested to hear what is dominating your agenda.','Leadership',4120,201,(SELECT id FROM public.community_groups WHERE slug='global-leaders')),
('Aarti Shah','Academic Coordinator, Ahmedabad','question','How often do you conduct meaningful classroom observations?','We do two formal observations a year and they feel performative. Considering moving to short weekly drop-ins.','Teacher Development',1980,87,(SELECT id FROM public.community_groups WHERE slug='academic-coordinators')),
('Daniel Osei','Director, Accra','case_study','How we cut teacher attrition from 22% to 9% in two years','Three changes: protected planning time, a real induction programme, and removing four low-value reporting tasks. Happy to share the full plan.','School Culture',3340,246,(SELECT id FROM public.community_groups WHERE slug='principals')),
('Lena Fischer','Head of School, Berlin','discussion','What wellbeing initiatives are actually working?','Mindfulness sessions had almost no measurable impact for us. Structured check-in tutor time did.','Student Wellbeing',2560,143,(SELECT id FROM public.community_groups WHERE slug='student-wellbeing')),
('Sunil Kapoor','School Owner, Delhi NCR','question','At what point does a second campus make financial sense?','We are at 92% capacity on one campus. What indicators did you use before expanding?','School Growth',1420,76,(SELECT id FROM public.community_groups WHERE slug='school-owners')),
('Maria Santos','Principal, São Paulo','discussion','How is your school approaching generative AI with teachers?','We started with a two-hour staff workshop and an opt-in pilot group. Adoption is far better than a mandate would have achieved.','AI in Education',2870,159,(SELECT id FROM public.community_groups WHERE slug='ai-education')),
('Imran Sheikh','Vice Principal, Karachi','question','Best structure for a weekly senior leadership meeting?','Ours runs 2 hours and achieves little. What agenda structure works for you?','School Operations',1760,64,(SELECT id FROM public.community_groups WHERE slug='school-operations')),
('Kavitha Rajan','Academic Coordinator, Chennai','best_practice','A lesson observation form that fits on one page','After years of 6-page rubrics we moved to one page with three questions. Teacher feedback improved dramatically.','Teacher Development',2230,178,(SELECT id FROM public.community_groups WHERE slug='academic-coordinators')),
('Peter Nyongesa','Principal, Nairobi','question','How do you handle a parent who escalates every issue to the board?','Looking for a de-escalation protocol that protects staff.','Parent Engagement',1650,71,(SELECT id FROM public.community_groups WHERE slug='principals')),
('Sofia Ricci','Head of School, Milan','discussion','Is the IB workload sustainable for teachers?','Our DP teachers are stretched. How are other IB schools managing this?','Curriculum',1340,58,(SELECT id FROM public.community_groups WHERE slug='ib-leaders')),
('Arjun Pillai','Principal, Kochi','question','NEP implementation: what has actually changed in your school?','Beyond documentation, what real classroom changes have you made?','Education Policy',2050,92,(SELECT id FROM public.community_groups WHERE slug='cbse-leaders')),
('Helen Cartwright','Director, Sydney','case_study','Rebuilding admissions after a 30% enquiry drop','We rewrote our positioning, redesigned the tour and trained the front office. Enquiries recovered in seven months.','Admissions',1890,134,(SELECT id FROM public.community_groups WHERE slug='school-owners')),
('Yusuf Rahman','Vice Principal, Dubai','question','What is your policy on phones in school?','We are considering a full ban. Interested in outcomes from schools that already did it.','School Operations',3010,187,(SELECT id FROM public.community_groups WHERE slug='international-schools')),
('Anjali Gupta','Principal, Jaipur','discussion','How do you develop middle leaders?','Our HODs manage timetables but do not lead learning. What development worked for you?','Leadership',1720,83,(SELECT id FROM public.community_groups WHERE slug='india-leaders')),
('Michael Turner','Principal, Toronto','best_practice','Our 15-minute daily staff huddle','Same time, standing, three items only. It replaced two weekly meetings.','School Operations',1480,112,(SELECT id FROM public.community_groups WHERE slug='global-leaders')),
('Reena Joseph','Academic Coordinator, Hyderabad','question','How do you assess reading across the whole school?','Looking for something manageable that gives real data.','Assessment',1290,54,(SELECT id FROM public.community_groups WHERE slug='academic-coordinators')),
('Ahmed Farouk','School Owner, Cairo','poll','What is your biggest challenge this month?','Recruitment, fee collection, parent expectations or staff morale? Vote and add context below.','Leadership',2440,96,(SELECT id FROM public.community_groups WHERE slug='school-owners'));

-- SEED RESOURCES
INSERT INTO public.resources (slug,title,description,category,resource_type,is_toolkit,is_free,downloads) VALUES
('school-improvement-plan-template','School Improvement Plan Template','A one-page SIP structure with priorities, milestones and monitoring.','School Leadership','Template',true,true,4820),
('teacher-observation-template','Teacher Observation Template','One-page observation form focused on three high-impact questions.','Teacher Development','Template',true,true,5310),
('staff-meeting-agenda','Staff Meeting Agenda Template','A meeting structure that ends on time with clear owners.','School Operations','Template',true,true,3120),
('parent-meeting-template','Parent Meeting Template','Structure for difficult and routine parent meetings.','Parent Engagement','Template',true,true,2740),
('academic-review-checklist','Academic Review Checklist','Termly academic health check for coordinators.','Curriculum','Checklist',true,true,2210),
('school-inspection-checklist','School Inspection Checklist','Prepare your school without panic.','Governance','Checklist',true,true,3480),
('teacher-appraisal-template','Teacher Appraisal Template','Growth-focused appraisal with evidence prompts.','HR','Template',true,true,2980),
('student-wellbeing-audit','Student Wellbeing Audit','Audit your wellbeing provision against six domains.','Student Wellbeing','Toolkit',true,true,1960),
('school-self-evaluation-tool','School Self-Evaluation Tool','Honest self-evaluation across leadership, teaching and outcomes.','School Leadership','Toolkit',true,true,2650),
('annual-planning-calendar','Annual Planning Calendar','A 12-month leadership planning calendar.','School Operations','Template',true,true,3040),
('new-principal-100-day-plan','New Principal 100-Day Plan','Week-by-week plan for your first 100 days.','School Leadership','Guide',true,true,6120),
('crisis-management-checklist','School Crisis Management Checklist','Roles, comms and escalation for critical incidents.','School Operations','Checklist',true,true,1840),
('ai-policy-template','AI Policy Template','An editable AI policy covering staff, students and assessment.','AI & Technology','Template',true,true,7240),
('digital-safety-checklist','Digital Safety Checklist','Safeguarding checks for devices, platforms and data.','AI & Technology','Checklist',true,true,2310),
('curriculum-mapping-guide','Curriculum Mapping Guide','Map coverage, progression and gaps across year groups.','Curriculum','Guide',false,true,1720),
('assessment-literacy-research','Assessment Literacy: Research Summary','What the evidence says about formative assessment at scale.','Assessment','Research',false,true,1290),
('admissions-funnel-toolkit','Admissions Funnel Toolkit','Enquiry tracking, tour scripts and conversion metrics.','Admissions','Toolkit',false,false,860),
('school-finance-primer','School Finance Primer for Non-Finance Leaders','Read a school budget with confidence.','Finance','Guide',false,false,940),
('teacher-retention-case-study','Teacher Retention: A Five-School Case Study','How one network cut attrition by 40%.','HR','Case Study',false,true,1610),
('nep-implementation-guide','NEP Implementation Guide for School Leaders','Translate policy into classroom-level change.','Education Policy','Guide',false,true,3350);
