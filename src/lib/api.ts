import { supabase } from "@/integrations/supabase/client";

export type Expert = {
  id: string;
  slug: string;
  name: string;
  title: string | null;
  organisation: string | null;
  country: string | null;
  bio: string | null;
  expertise: string[];
  photo_url: string | null;
  rating: number;
  courses_count: number;
  webinars_count: number;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  description: string | null;
  topic: string;
  level: string;
  duration_hours: number;
  language: string;
  price_inr: number;
  is_free: boolean;
  certificate: boolean;
  rating: number;
  learners: number;
  outcomes: string[];
  audience: string[];
  format: string;
  expert_id: string | null;
  experts?: Expert | null;
};

export type Lesson = {
  id: string;
  course_id: string;
  module_title: string;
  module_order: number;
  title: string;
  lesson_order: number;
  kind: string;
  duration_min: number;
  content: string | null;
  video_url: string | null;
  document_url: string | null;
};

export type Webinar = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  topic: string;
  starts_at: string;
  duration_min: number;
  price_inr: number;
  is_free: boolean;
  status: string;
  certificate: boolean;
  registered_count: number;
  expert_id: string | null;
  meeting_url?: string | null;
  recording_url?: string | null;
  image_url?: string | null;
  experts?: Expert | null;
};

export type Post = {
  id: string;
  author_name: string;
  author_role: string | null;
  kind: string;
  title: string | null;
  body: string;
  topic: string | null;
  views: number;
  reactions: number;
  created_at: string;
  group_id: string | null;
  user_id: string | null;
};

export type Resource = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  resource_type: string;
  is_toolkit: boolean;
  is_free: boolean;
  downloads: number;
  file_url: string | null;
};

export type Certificate = {
  id: string;
  certificate_id: string;
  recipient_name: string;
  kind: string;
  title: string;
  issuer: string;
  speaker: string | null;
  duration_text: string | null;
  issued_at: string;
  revoked: boolean;
};

const COURSE_SELECT = "*, experts(*)";

export const coursesQuery = {
  queryKey: ["courses"],
  queryFn: async (): Promise<Course[]> => {
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_SELECT)
      .order("learners", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Course[];
  },
};

export const courseQuery = (slug: string) => ({
  queryKey: ["course", slug],
  queryFn: async (): Promise<Course | null> => {
    const { data, error } = await supabase
      .from("courses")
      .select(COURSE_SELECT)
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as Course | null;
  },
});

export const lessonsQuery = (courseId: string | undefined) => ({
  queryKey: ["lessons", courseId],
  enabled: Boolean(courseId),
  queryFn: async (): Promise<Lesson[]> => {
    if (!courseId) return [];
    const { data, error } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("module_order")
      .order("lesson_order");
    if (error) throw error;
    return (data ?? []) as unknown as Lesson[];
  },
});

export const webinarsQuery = {
  queryKey: ["webinars"],
  queryFn: async (): Promise<Webinar[]> => {
    const { data, error } = await supabase
      .from("webinars")
      .select("*, experts(*)")
      .order("starts_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Webinar[];
  },
};

export const expertsQuery = {
  queryKey: ["experts"],
  queryFn: async (): Promise<Expert[]> => {
    const { data, error } = await supabase
      .from("experts")
      .select("*")
      .order("rating", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Expert[];
  },
};

export const postsQuery = {
  queryKey: ["posts"],
  queryFn: async (): Promise<Post[]> => {
    const { data, error } = await supabase
      .from("community_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []) as unknown as Post[];
  },
};

export const groupsQuery = {
  queryKey: ["groups"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("community_groups")
      .select("*")
      .order("members_count", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export const resourcesQuery = {
  queryKey: ["resources"],
  queryFn: async (): Promise<Resource[]> => {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .order("downloads", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Resource[];
  },
};

export const certificateQuery = (certificateId: string) => ({
  queryKey: ["certificate", certificateId],
  queryFn: async (): Promise<Certificate | null> => {
    const { data, error } = await supabase.rpc("verify_certificate", {
      _certificate_id: certificateId,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return (row ?? null) as unknown as Certificate | null;
  },
});
