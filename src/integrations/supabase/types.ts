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
      attractions: {
        Row: {
          category: Database["public"]["Enums"]["attraction_category"]
          city: string
          cover_image_path: string
          created_at: string
          external_url: string | null
          gallery: Json
          id: string
          is_active: boolean
          long_description: string | null
          short_description: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["attraction_category"]
          city: string
          cover_image_path: string
          created_at?: string
          external_url?: string | null
          gallery?: Json
          id?: string
          is_active?: boolean
          long_description?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["attraction_category"]
          city?: string
          cover_image_path?: string
          created_at?: string
          external_url?: string | null
          gallery?: Json
          id?: string
          is_active?: boolean
          long_description?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          created_at: string
          end_date: string
          id: string
          property_id: string
          reason: string | null
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          property_id: string
          reason?: string | null
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          property_id?: string
          reason?: string | null
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          button_label: string
          button_url: string | null
          city: string
          created_at: string
          description: string | null
          end_date: string
          id: string
          image_path: string
          is_active: boolean
          sort_order: number
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          button_label?: string
          button_url?: string | null
          city: string
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          image_path: string
          is_active?: boolean
          sort_order?: number
          start_date: string
          title: string
          updated_at?: string
        }
        Update: {
          button_label?: string
          button_url?: string | null
          city?: string
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          image_path?: string
          is_active?: boolean
          sort_order?: number
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      instagram_posts: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_path: string
          is_active: boolean
          post_url: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path: string
          is_active?: boolean
          post_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_path?: string
          is_active?: boolean
          post_url?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          file_size: number
          id: string
          is_current: boolean
          original_filename: string
          storage_path: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["legal_doc_type"]
          file_size: number
          id?: string
          is_current?: boolean
          original_filename: string
          storage_path: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["legal_doc_type"]
          file_size?: number
          id?: string
          is_current?: boolean
          original_filename?: string
          storage_path?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: []
      }
      properties: {
        Row: {
          accepts_pets: boolean
          address_detail: string | null
          amenities: Json | null
          bathrooms: number
          bedrooms: number
          checkin_time: string
          checkout_time: string
          city: string
          cleaning_fee: number
          created_at: string
          description: string | null
          featured: boolean
          google_maps_url: string | null
          high_season_dates: Json | null
          house_rules: string | null
          id: string
          max_guests: number
          min_nights_weekday: number
          min_nights_weekend: number
          name: string
          parking_spots: number
          price_high_season: number | null
          price_weekday: number
          price_weekend: number
          slug: string
          sort_order: number | null
          status: string
          tier: number
          updated_at: string
        }
        Insert: {
          accepts_pets?: boolean
          address_detail?: string | null
          amenities?: Json | null
          bathrooms: number
          bedrooms: number
          checkin_time?: string
          checkout_time?: string
          city: string
          cleaning_fee?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          google_maps_url?: string | null
          high_season_dates?: Json | null
          house_rules?: string | null
          id?: string
          max_guests: number
          min_nights_weekday?: number
          min_nights_weekend?: number
          name: string
          parking_spots?: number
          price_high_season?: number | null
          price_weekday: number
          price_weekend: number
          slug: string
          sort_order?: number | null
          status?: string
          tier?: number
          updated_at?: string
        }
        Update: {
          accepts_pets?: boolean
          address_detail?: string | null
          amenities?: Json | null
          bathrooms?: number
          bedrooms?: number
          checkin_time?: string
          checkout_time?: string
          city?: string
          cleaning_fee?: number
          created_at?: string
          description?: string | null
          featured?: boolean
          google_maps_url?: string | null
          high_season_dates?: Json | null
          house_rules?: string | null
          id?: string
          max_guests?: number
          min_nights_weekday?: number
          min_nights_weekend?: number
          name?: string
          parking_spots?: number
          price_high_season?: number | null
          price_weekday?: number
          price_weekend?: number
          slug?: string
          sort_order?: number | null
          status?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      property_photos: {
        Row: {
          created_at: string
          id: string
          is_cover: boolean
          property_id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_cover?: boolean
          property_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_submissions: {
        Row: {
          admin_notes: string | null
          bedrooms: number
          city: string
          created_at: string
          desired_daily_rate: number
          email: string
          house_description: string
          id: string
          max_guests: number
          message: string | null
          name: string
          photo_url: string | null
          status: string
          updated_at: string
          whatsapp: string
        }
        Insert: {
          admin_notes?: string | null
          bedrooms: number
          city: string
          created_at?: string
          desired_daily_rate: number
          email: string
          house_description: string
          id?: string
          max_guests: number
          message?: string | null
          name: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          whatsapp: string
        }
        Update: {
          admin_notes?: string | null
          bedrooms?: number
          city?: string
          created_at?: string
          desired_daily_rate?: number
          email?: string
          house_description?: string
          id?: string
          max_guests?: number
          message?: string | null
          name?: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      reservation_documents: {
        Row: {
          created_at: string
          file_name: string
          file_type: string
          id: string
          public_url: string
          reservation_id: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          public_url: string
          reservation_id: string
          storage_path: string
          uploaded_by?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          public_url?: string
          reservation_id?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_documents_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_status_history: {
        Row: {
          changed_at: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          reservation_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          reservation_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          reservation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_status_history_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          admin_notes: string | null
          checkin_date: string
          checkout_date: string
          created_at: string
          guest_email: string | null
          guest_message: string | null
          guest_name: string
          guest_whatsapp: string
          how_found: string | null
          id: string
          num_adults: number
          num_children: number
          num_pets: number
          num_vehicles: number
          price_breakdown: Json | null
          property_id: string
          reservation_code: string
          status: string
          terms_accepted: boolean
          total_nights: number
          total_price: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          checkin_date: string
          checkout_date: string
          created_at?: string
          guest_email?: string | null
          guest_message?: string | null
          guest_name: string
          guest_whatsapp: string
          how_found?: string | null
          id?: string
          num_adults: number
          num_children?: number
          num_pets?: number
          num_vehicles?: number
          price_breakdown?: Json | null
          property_id: string
          reservation_code: string
          status?: string
          terms_accepted?: boolean
          total_nights: number
          total_price: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          checkin_date?: string
          checkout_date?: string
          created_at?: string
          guest_email?: string | null
          guest_message?: string | null
          guest_name?: string
          guest_whatsapp?: string
          how_found?: string | null
          id?: string
          num_adults?: number
          num_children?: number
          num_pets?: number
          num_vehicles?: number
          price_breakdown?: Json | null
          property_id?: string
          reservation_code?: string
          status?: string
          terms_accepted?: boolean
          total_nights?: number
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      slugify: { Args: { input: string }; Returns: string }
    }
    Enums: {
      app_role: "admin"
      attraction_category: "atracao" | "restaurante" | "passeio"
      legal_doc_type: "terms" | "privacy"
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
      app_role: ["admin"],
      attraction_category: ["atracao", "restaurante", "passeio"],
      legal_doc_type: ["terms", "privacy"],
    },
  },
} as const
