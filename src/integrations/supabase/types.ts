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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_points: {
        Row: {
          area: string
          confirmations: number
          id: string
          kind: string
          last_confirmed_at: string
          lat: number
          lng: number
          source: string
        }
        Insert: {
          area?: string
          confirmations?: number
          id: string
          kind: string
          last_confirmed_at?: string
          lat: number
          lng: number
          source?: string
        }
        Update: {
          area?: string
          confirmations?: number
          id?: string
          kind?: string
          last_confirmed_at?: string
          lat?: number
          lng?: number
          source?: string
        }
        Relationships: []
      }
      barriers: {
        Row: {
          area: string
          confirmations: number
          conflicts: number
          created_at: string
          id: string
          is_demo: boolean
          is_temporary: boolean
          last_confirmed_at: string
          lat: number
          lng: number
          note: string | null
          reporter_id: string | null
          resolved_at: string | null
          severity: string
          source: string
          status: string
          type: string
        }
        Insert: {
          area?: string
          confirmations?: number
          conflicts?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          is_temporary?: boolean
          last_confirmed_at?: string
          lat: number
          lng: number
          note?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          severity: string
          source?: string
          status?: string
          type: string
        }
        Update: {
          area?: string
          confirmations?: number
          conflicts?: number
          created_at?: string
          id?: string
          is_demo?: boolean
          is_temporary?: boolean
          last_confirmed_at?: string
          lat?: number
          lng?: number
          note?: string | null
          reporter_id?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          type?: string
        }
        Relationships: []
      }
      place_features: {
        Row: {
          confirmations: number
          conflicts: number
          feature: string
          last_confirmed_at: string
          place_id: string
          source: string
          status: string
        }
        Insert: {
          confirmations?: number
          conflicts?: number
          feature: string
          last_confirmed_at?: string
          place_id: string
          source?: string
          status?: string
        }
        Update: {
          confirmations?: number
          conflicts?: number
          feature?: string
          last_confirmed_at?: string
          place_id?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "place_features_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          area: string
          category: string
          created_at: string
          id: string
          is_demo: boolean
          lat: number
          lng: number
          name: string
        }
        Insert: {
          area?: string
          category: string
          created_at?: string
          id: string
          is_demo?: boolean
          lat: number
          lng: number
          name: string
        }
        Update: {
          area?: string
          category?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          lat?: number
          lng?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          access_profile: Json | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          access_profile?: Json | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          access_profile?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_media: {
        Row: {
          ai_analysis: Json | null
          barrier_id: string | null
          blurred: boolean
          confirmations: number
          conflicts: number
          created_at: string
          id: string
          last_confirmed_at: string
          path: string
          place_id: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: Json | null
          barrier_id?: string | null
          blurred?: boolean
          confirmations?: number
          conflicts?: number
          created_at?: string
          id?: string
          last_confirmed_at?: string
          path: string
          place_id?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: Json | null
          barrier_id?: string | null
          blurred?: boolean
          confirmations?: number
          conflicts?: number
          created_at?: string
          id?: string
          last_confirmed_at?: string
          path?: string
          place_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_media_barrier_id_fkey"
            columns: ["barrier_id"]
            isOneToOne: false
            referencedRelation: "barriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_media_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "places"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          created_at: string
          id: string
          proposed_status: string | null
          target_id: string
          target_type: string
          user_id: string
          vote: string
        }
        Insert: {
          created_at?: string
          id?: string
          proposed_status?: string | null
          target_id: string
          target_type: string
          user_id?: string
          vote: string
        }
        Update: {
          created_at?: string
          id?: string
          proposed_status?: string | null
          target_id?: string
          target_type?: string
          user_id?: string
          vote?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
