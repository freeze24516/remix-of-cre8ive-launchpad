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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          actor_id: string | null
          created_at: string
          id: number
          kind: Database["public"]["Enums"]["analytics_kind"]
          meta: Json
          subject_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          id?: number
          kind: Database["public"]["Enums"]["analytics_kind"]
          meta?: Json
          subject_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          id?: number
          kind?: Database["public"]["Enums"]["analytics_kind"]
          meta?: Json
          subject_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      creator_categories: {
        Row: {
          category_id: string
          creator_id: string
        }
        Insert: {
          category_id: string
          creator_id: string
        }
        Update: {
          category_id?: string
          creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_categories_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_skills: {
        Row: {
          creator_id: string
          skill: string
        }
        Insert: {
          creator_id: string
          skill: string
        }
        Update: {
          creator_id?: string
          skill?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_skills_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_unavailable_dates: {
        Row: {
          created_at: string
          creator_id: string
          date: string
          id: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          date: string
          id?: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          date?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_unavailable_dates_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          about: string | null
          availability: Database["public"]["Enums"]["availability_status"]
          budget_tier: string | null
          completion_rate: number | null
          created_at: string
          experience: Database["public"]["Enums"]["experience_level"] | null
          headline: string | null
          hire_count: number
          id: string
          is_approved: boolean
          is_featured: boolean
          is_spotlight: boolean
          is_verified: boolean
          last_active_at: string
          location_scope: string | null
          repeat_client_rate: number | null
          response_hours: number
          spotlight_until: string | null
          tools: string[]
          updated_at: string
          user_id: string
          vacation_from: string | null
          vacation_to: string | null
          verification_level: number
          verification_requested_at: string | null
          view_count: number
          years_experience: number | null
        }
        Insert: {
          about?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          budget_tier?: string | null
          completion_rate?: number | null
          created_at?: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          headline?: string | null
          hire_count?: number
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          is_spotlight?: boolean
          is_verified?: boolean
          last_active_at?: string
          location_scope?: string | null
          repeat_client_rate?: number | null
          response_hours?: number
          spotlight_until?: string | null
          tools?: string[]
          updated_at?: string
          user_id: string
          vacation_from?: string | null
          vacation_to?: string | null
          verification_level?: number
          verification_requested_at?: string | null
          view_count?: number
          years_experience?: number | null
        }
        Update: {
          about?: string | null
          availability?: Database["public"]["Enums"]["availability_status"]
          budget_tier?: string | null
          completion_rate?: number | null
          created_at?: string
          experience?: Database["public"]["Enums"]["experience_level"] | null
          headline?: string | null
          hire_count?: number
          id?: string
          is_approved?: boolean
          is_featured?: boolean
          is_spotlight?: boolean
          is_verified?: boolean
          last_active_at?: string
          location_scope?: string | null
          repeat_client_rate?: number | null
          response_hours?: number
          spotlight_until?: string | null
          tools?: string[]
          updated_at?: string
          user_id?: string
          vacation_from?: string | null
          vacation_to?: string | null
          verification_level?: number
          verification_requested_at?: string | null
          view_count?: number
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creators_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          created_at: string
          creator_id: string
          currency: string
          id: string
          job_id: string
          pitch: string
          quoted_rate: number | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          currency?: string
          id?: string
          job_id: string
          pitch: string
          quoted_rate?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          currency?: string
          id?: string
          job_id?: string
          pitch?: string
          quoted_rate?: number | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          category_id: string | null
          client_id: string
          created_at: string
          currency: string
          deadline: string | null
          description: string
          id: string
          location: string | null
          remote_ok: boolean
          skills: string[]
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          client_id: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description: string
          id?: string
          location?: string | null
          remote_ok?: boolean
          skills?: string[]
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          category_id?: string | null
          client_id?: string
          created_at?: string
          currency?: string
          deadline?: string | null
          description?: string
          id?: string
          location?: string | null
          remote_ok?: boolean
          skills?: string[]
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json
          body: string
          conversation_id: string
          created_at: string
          delivered_at: string | null
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json
          body: string
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json
          body?: string
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolios: {
        Row: {
          case_study: Json
          category_id: string | null
          client_name: string | null
          cover_image: string | null
          created_at: string
          creator_id: string
          description: string | null
          id: string
          industry: string | null
          is_approved: boolean
          is_featured: boolean
          project_url: string | null
          services: string[]
          software: string[]
          team_size: string | null
          timeline: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          case_study?: Json
          category_id?: string | null
          client_name?: string | null
          cover_image?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          industry?: string | null
          is_approved?: boolean
          is_featured?: boolean
          project_url?: string | null
          services?: string[]
          software?: string[]
          team_size?: string | null
          timeline?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          case_study?: Json
          category_id?: string | null
          client_name?: string | null
          cover_image?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_approved?: boolean
          is_featured?: boolean
          project_url?: string | null
          services?: string[]
          software?: string[]
          team_size?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "portfolios_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolios_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string
          id: string
          is_suspended: boolean
          kind: Database["public"]["Enums"]["user_kind"]
          languages: string[]
          location: string | null
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name: string
          id: string
          is_suspended?: boolean
          kind?: Database["public"]["Enums"]["user_kind"]
          languages?: string[]
          location?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_suspended?: boolean
          kind?: Database["public"]["Enums"]["user_kind"]
          languages?: string[]
          location?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: Database["public"]["Enums"]["report_target"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: Database["public"]["Enums"]["report_target"]
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          direction: Database["public"]["Enums"]["review_direction"]
          id: string
          job_id: string | null
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction: Database["public"]["Enums"]["review_direction"]
          id?: string
          job_id?: string | null
          rating: number
          reviewee_id: string
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["review_direction"]
          id?: string
          job_id?: string | null
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_creators: {
        Row: {
          client_id: string
          created_at: string
          creator_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          creator_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          creator_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_creators_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
          role: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_or_create_conversation: { Args: { _other: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_in_conversation: { Args: { _conv_id: string }; Returns: boolean }
    }
    Enums: {
      analytics_kind:
        | "profile_view"
        | "portfolio_view"
        | "contact_request"
        | "hire_request"
        | "job_application"
      app_role: "admin" | "moderator" | "user"
      application_status:
        | "pending"
        | "shortlisted"
        | "accepted"
        | "rejected"
        | "withdrawn"
      availability_status: "available" | "limited" | "booked" | "vacation"
      experience_level: "entry" | "intermediate" | "expert"
      job_status: "draft" | "open" | "in_review" | "closed" | "filled"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      report_target: "creator" | "client" | "job" | "portfolio" | "message"
      review_direction: "client_to_creator" | "creator_to_client"
      user_kind: "client" | "creator"
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
      analytics_kind: [
        "profile_view",
        "portfolio_view",
        "contact_request",
        "hire_request",
        "job_application",
      ],
      app_role: ["admin", "moderator", "user"],
      application_status: [
        "pending",
        "shortlisted",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      availability_status: ["available", "limited", "booked", "vacation"],
      experience_level: ["entry", "intermediate", "expert"],
      job_status: ["draft", "open", "in_review", "closed", "filled"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      report_target: ["creator", "client", "job", "portfolio", "message"],
      review_direction: ["client_to_creator", "creator_to_client"],
      user_kind: ["client", "creator"],
    },
  },
} as const
