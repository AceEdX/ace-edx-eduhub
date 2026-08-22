export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      ai_generations: {
        Row: {
          created_at: string
          id: string
          kind: string
          meta: Json
          output: string
          prompt: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          output: string
          prompt: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          output?: string
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_id: string
          course_id: string | null
          duration_text: string | null
          id: string
          issued_at: string
          issuer: string
          kind: string
          recipient_name: string
          revoked: boolean
          speaker: string | null
          title: string
          user_id: string
          webinar_id: string | null
        }
        Insert: {
          certificate_id?: string
          course_id?: string | null
          duration_text?: string | null
          id?: string
          issued_at?: string
          issuer?: string
          kind?: string
          recipient_name: string
          revoked?: boolean
          speaker?: string | null
          title: string
          user_id: string
          webinar_id?: string | null
        }
        Update: {
          certificate_id?: string
          course_id?: string | null
          duration_text?: string | null
          id?: string
          issued_at?: string
          issuer?: string
          kind?: string
          recipient_name?: string
          revoked?: boolean
          speaker?: string | null
          title?: string
          user_id?: string
          webinar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comments: {
        Row: {
          author_name: string
          body: string
          created_at: string
          id: string
          post_id: string
          user_id: string | null
        }
        Insert: {
          author_name?: string
          body: string
          created_at?: string
          id?: string
          post_id: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          members_count: number
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          members_count?: number
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          members_count?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          author_name: string
          author_role: string | null
          body: string
          created_at: string
          group_id: string | null
          id: string
          kind: string
          reactions: number
          title: string | null
          topic: string | null
          user_id: string | null
          views: number
        }
        Insert: {
          author_name?: string
          author_role?: string | null
          body: string
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          reactions?: number
          title?: string | null
          topic?: string | null
          user_id?: string | null
          views?: number
        }
        Update: {
          author_name?: string
          author_role?: string | null
          body?: string
          created_at?: string
          group_id?: string | null
          id?: string
          kind?: string
          reactions?: number
          title?: string | null
          topic?: string | null
          user_id?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          details: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_inr: number
          id: string
          order_id: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_inr?: number
          id?: string
          order_id?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_inr?: number
          id?: string
          order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          applies_to: string
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_redemptions: number | null
          redemptions: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          applies_to?: string
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          redemptions?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          applies_to?: string
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_redemptions?: number | null
          redemptions?: number
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          audience: string[]
          certificate: boolean
          created_at: string
          description: string | null
          duration_hours: number
          expert_id: string | null
          format: string
          id: string
          image_url: string | null
          is_free: boolean
          language: string
          learners: number
          level: string
          outcomes: string[]
          price_inr: number
          principal_id: string | null
          published: boolean
          rating: number
          revenue_share_pct: number | null
          slug: string
          summary: string | null
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          audience?: string[]
          certificate?: boolean
          created_at?: string
          description?: string | null
          duration_hours?: number
          expert_id?: string | null
          format?: string
          id?: string
          image_url?: string | null
          is_free?: boolean
          language?: string
          learners?: number
          level?: string
          outcomes?: string[]
          price_inr?: number
          principal_id?: string | null
          published?: boolean
          rating?: number
          revenue_share_pct?: number | null
          slug: string
          summary?: string | null
          title: string
          topic?: string
          updated_at?: string
        }
        Update: {
          audience?: string[]
          certificate?: boolean
          created_at?: string
          description?: string | null
          duration_hours?: number
          expert_id?: string | null
          format?: string
          id?: string
          image_url?: string | null
          is_free?: boolean
          language?: string
          learners?: number
          level?: string
          outcomes?: string[]
          price_inr?: number
          principal_id?: string | null
          published?: boolean
          rating?: number
          revenue_share_pct?: number | null
          slug?: string
          summary?: string | null
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "resource_principals"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          progress: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          progress?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      experts: {
        Row: {
          bio: string | null
          country: string | null
          courses_count: number
          created_at: string
          expertise: string[]
          id: string
          name: string
          organisation: string | null
          photo_url: string | null
          rating: number
          slug: string
          title: string | null
          webinars_count: number
        }
        Insert: {
          bio?: string | null
          country?: string | null
          courses_count?: number
          created_at?: string
          expertise?: string[]
          id?: string
          name: string
          organisation?: string | null
          photo_url?: string | null
          rating?: number
          slug: string
          title?: string | null
          webinars_count?: number
        }
        Update: {
          bio?: string | null
          country?: string | null
          courses_count?: number
          created_at?: string
          expertise?: string[]
          id?: string
          name?: string
          organisation?: string | null
          photo_url?: string | null
          rating?: number
          slug?: string
          title?: string | null
          webinars_count?: number
        }
        Relationships: []
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "community_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_enrollments: {
        Row: {
          created_at: string
          id: string
          path_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_enrollments_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_path_items: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          item_type: string
          label: string | null
          path_id: string
          resource_id: string | null
          step_order: number
          webinar_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          item_type?: string
          label?: string | null
          path_id: string
          resource_id?: string | null
          step_order?: number
          webinar_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          item_type?: string
          label?: string | null
          path_id?: string
          resource_id?: string | null
          step_order?: number
          webinar_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_items_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_items_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_items_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          audience: string | null
          created_at: string
          id: string
          image_url: string | null
          level: string
          published: boolean
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          level?: string
          published?: boolean
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          level?: string
          published?: boolean
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string
          course_id: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          course_id: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          course_id?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          document_url: string | null
          duration_min: number
          id: string
          kind: string
          lesson_order: number
          module_order: number
          module_title: string
          title: string
          video_url: string | null
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          document_url?: string | null
          duration_min?: number
          id?: string
          kind?: string
          lesson_order?: number
          module_order?: number
          module_title: string
          title: string
          video_url?: string | null
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          document_url?: string | null
          duration_min?: number
          id?: string
          kind?: string
          lesson_order?: number
          module_order?: number
          module_title?: string
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          clip_end_sec: number | null
          clip_start_sec: number | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_sec: number
          id: string
          media_type: string
          published: boolean
          source_url: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          transcript: string | null
          updated_at: string
          url: string
          views: number
        }
        Insert: {
          clip_end_sec?: number | null
          clip_start_sec?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_sec?: number
          id?: string
          media_type?: string
          published?: boolean
          source_url?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          transcript?: string | null
          updated_at?: string
          url: string
          views?: number
        }
        Update: {
          clip_end_sec?: number | null
          clip_start_sec?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_sec?: number
          id?: string
          media_type?: string
          published?: boolean
          source_url?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          transcript?: string | null
          updated_at?: string
          url?: string
          views?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_inr: number
          coupon_code: string | null
          created_at: string
          discount_inr: number
          id: string
          item_id: string | null
          item_title: string
          item_type: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_inr?: number
          coupon_code?: string | null
          created_at?: string
          discount_inr?: number
          id?: string
          item_id?: string | null
          item_title: string
          item_type: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_inr?: number
          coupon_code?: string | null
          created_at?: string
          discount_inr?: number
          id?: string
          item_id?: string | null
          item_title?: string
          item_type?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_saves: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          board: string | null
          city: string | null
          country: string | null
          created_at: string
          designation: string | null
          full_name: string
          id: string
          interests: string[]
          learning_hours: number
          linkedin_url: string | null
          onboarding_complete: boolean
          professional_role: string | null
          school_name: string | null
          school_website: string | null
          state: string | null
          streak_days: number
          updated_at: string
          verification_status: string
          visibility: string
          years_in_education: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          board?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          designation?: string | null
          full_name?: string
          id: string
          interests?: string[]
          learning_hours?: number
          linkedin_url?: string | null
          onboarding_complete?: boolean
          professional_role?: string | null
          school_name?: string | null
          school_website?: string | null
          state?: string | null
          streak_days?: number
          updated_at?: string
          verification_status?: string
          visibility?: string
          years_in_education?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          board?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          designation?: string | null
          full_name?: string
          id?: string
          interests?: string[]
          learning_hours?: number
          linkedin_url?: string | null
          onboarding_complete?: boolean
          professional_role?: string | null
          school_name?: string | null
          school_website?: string | null
          state?: string | null
          streak_days?: number
          updated_at?: string
          verification_status?: string
          visibility?: string
          years_in_education?: number | null
        }
        Relationships: []
      }
      resource_principal_applications: {
        Row: {
          admin_notes: string | null
          bio: string
          created_at: string
          credentials: string | null
          expertise: string[]
          headline: string | null
          id: string
          linkedin_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_work_url: string | null
          speaking_topics: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          bio: string
          created_at?: string
          credentials?: string | null
          expertise?: string[]
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_work_url?: string | null
          speaking_topics?: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          bio?: string
          created_at?: string
          credentials?: string | null
          expertise?: string[]
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_work_url?: string | null
          speaking_topics?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      resource_principals: {
        Row: {
          bio: string | null
          city: string | null
          country: string | null
          created_at: string
          credentials: string | null
          display_name: string
          expertise: string[]
          featured: boolean
          headline: string | null
          id: string
          linkedin_url: string | null
          photo_url: string | null
          revenue_share_pct: number
          school_name: string | null
          slug: string
          speaking_topics: string[]
          status: string
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credentials?: string | null
          display_name: string
          expertise?: string[]
          featured?: boolean
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          photo_url?: string | null
          revenue_share_pct?: number
          school_name?: string | null
          slug: string
          speaking_topics?: string[]
          status?: string
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          credentials?: string | null
          display_name?: string
          expertise?: string[]
          featured?: boolean
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          photo_url?: string | null
          revenue_share_pct?: number
          school_name?: string | null
          slug?: string
          speaking_topics?: string[]
          status?: string
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          downloads: number
          file_url: string | null
          id: string
          is_free: boolean
          is_toolkit: boolean
          resource_type: string
          slug: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          downloads?: number
          file_url?: string | null
          id?: string
          is_free?: boolean
          is_toolkit?: boolean
          resource_type?: string
          slug: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          downloads?: number
          file_url?: string | null
          id?: string
          is_free?: boolean
          is_toolkit?: boolean
          resource_type?: string
          slug?: string
          title?: string
        }
        Relationships: []
      }
      revenue_shares: {
        Row: {
          created_at: string
          gross_inr: number
          id: string
          item_title: string
          order_id: string | null
          payout_inr: number
          principal_id: string
          share_pct: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gross_inr?: number
          id?: string
          item_title: string
          order_id?: string | null
          payout_inr?: number
          principal_id: string
          share_pct?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gross_inr?: number
          id?: string
          item_title?: string
          order_id?: string | null
          payout_inr?: number
          principal_id?: string
          share_pct?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_shares_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_shares_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "resource_principals"
            referencedColumns: ["id"]
          },
        ]
      }
      school_verifications: {
        Row: {
          admin_notes: string | null
          affiliation_number: string
          board: string | null
          city: string | null
          country: string | null
          created_at: string
          designation: string | null
          full_name: string
          id: string
          linkedin_url: string | null
          mobile: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_name: string
          school_website: string | null
          state: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          affiliation_number: string
          board?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          designation?: string | null
          full_name: string
          id?: string
          linkedin_url?: string | null
          mobile?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_name: string
          school_website?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          affiliation_number?: string
          board?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          designation?: string | null
          full_name?: string
          id?: string
          linkedin_url?: string | null
          mobile?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_name?: string
          school_website?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_publications: {
        Row: {
          caption: string
          channel: string
          created_at: string
          created_by: string | null
          error: string | null
          id: string
          link_url: string | null
          media_id: string | null
          published_url: string | null
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          caption: string
          channel: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          link_url?: string | null
          media_id?: string | null
          published_url?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          caption?: string
          channel?: string
          created_at?: string
          created_by?: string | null
          error?: string | null
          id?: string
          link_url?: string | null
          media_id?: string | null
          published_url?: string | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_publications_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_requests: {
        Row: {
          audience_size: number | null
          budget_inr: number | null
          city: string | null
          created_at: string
          event_date: string | null
          event_format: string
          event_name: string
          id: string
          message: string | null
          principal_id: string | null
          requester_id: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          audience_size?: number | null
          budget_inr?: number | null
          city?: string | null
          created_at?: string
          event_date?: string | null
          event_format?: string
          event_name: string
          id?: string
          message?: string | null
          principal_id?: string | null
          requester_id: string
          status?: string
          topic: string
          updated_at?: string
        }
        Update: {
          audience_size?: number | null
          budget_inr?: number | null
          city?: string | null
          created_at?: string
          event_date?: string | null
          event_format?: string
          event_name?: string
          id?: string
          message?: string | null
          principal_id?: string | null
          requester_id?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_requests_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "resource_principals"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsorships: {
        Row: {
          admin_notes: string | null
          budget_inr: number | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string
          id: string
          message: string | null
          package_type: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          budget_inr?: number | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string
          id?: string
          message?: string | null
          package_type?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          budget_inr?: number | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string
          id?: string
          message?: string | null
          package_type?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          active: boolean
          created_at: string
          features: string[]
          id: string
          interval_months: number
          name: string
          price_inr: number
          slug: string
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          features?: string[]
          id?: string
          interval_months?: number
          name: string
          price_inr?: number
          slug: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          features?: string[]
          id?: string
          interval_months?: number
          name?: string
          price_inr?: number
          slug?: string
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string
          id: string
          order_id: string | null
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string
          id?: string
          order_id?: string | null
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string
          id?: string
          order_id?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webinar_registrations: {
        Row: {
          attendance_minutes: number
          attended: boolean
          created_at: string
          id: string
          joined_at: string | null
          user_id: string
          webinar_id: string
        }
        Insert: {
          attendance_minutes?: number
          attended?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          user_id: string
          webinar_id: string
        }
        Update: {
          attendance_minutes?: number
          attended?: boolean
          created_at?: string
          id?: string
          joined_at?: string | null
          user_id?: string
          webinar_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinar_registrations_webinar_id_fkey"
            columns: ["webinar_id"]
            isOneToOne: false
            referencedRelation: "webinars"
            referencedColumns: ["id"]
          },
        ]
      }
      webinars: {
        Row: {
          certificate: boolean
          created_at: string
          description: string | null
          duration_min: number
          expert_id: string | null
          has_meeting_link: boolean | null
          has_recording: boolean | null
          id: string
          image_url: string | null
          is_free: boolean
          meeting_url: string | null
          price_inr: number
          principal_id: string | null
          program_type: string
          published: boolean
          recording_url: string | null
          registered_count: number
          revenue_share_pct: number | null
          slug: string
          starts_at: string
          status: string
          stream_provider: string
          title: string
          topic: string
        }
        Insert: {
          certificate?: boolean
          created_at?: string
          description?: string | null
          duration_min?: number
          expert_id?: string | null
          has_meeting_link?: boolean | null
          has_recording?: boolean | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          meeting_url?: string | null
          price_inr?: number
          principal_id?: string | null
          program_type?: string
          published?: boolean
          recording_url?: string | null
          registered_count?: number
          revenue_share_pct?: number | null
          slug: string
          starts_at: string
          status?: string
          stream_provider?: string
          title: string
          topic?: string
        }
        Update: {
          certificate?: boolean
          created_at?: string
          description?: string | null
          duration_min?: number
          expert_id?: string | null
          has_meeting_link?: boolean | null
          has_recording?: boolean | null
          id?: string
          image_url?: string | null
          is_free?: boolean
          meeting_url?: string | null
          price_inr?: number
          principal_id?: string | null
          program_type?: string
          published?: boolean
          recording_url?: string | null
          registered_count?: number
          revenue_share_pct?: number | null
          slug?: string
          starts_at?: string
          status?: string
          stream_provider?: string
          title?: string
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "webinars_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "experts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webinars_principal_id_fkey"
            columns: ["principal_id"]
            isOneToOne: false
            referencedRelation: "resource_principals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      course_outline: {
        Args: { _course_id: string }
        Returns: {
          duration_min: number
          id: string
          kind: string
          lesson_order: number
          module_order: number
          module_title: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_principal: {
        Args: { _principal_id: string; _user_id: string }
        Returns: boolean
      }
      is_resource_principal: { Args: { _user_id: string }; Returns: boolean }
      verify_certificate: {
        Args: { _certificate_id: string }
        Returns: {
          certificate_id: string
          duration_text: string
          issued_at: string
          issuer: string
          kind: string
          recipient_name: string
          revoked: boolean
          speaker: string
          title: string
        }[]
      }
      webinar_links: {
        Args: { _webinar_id: string }
        Returns: {
          meeting_url: string
          recording_url: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "expert" | "member" | "institution_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "expert", "member", "institution_admin"],
    },
  },
} as const
