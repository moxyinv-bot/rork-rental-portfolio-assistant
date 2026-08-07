/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
      household_members: {
        Row: {
          household_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          household_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          household_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "household_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          invite_code: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          invite_code?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          invite_code?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "households_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_documents: {
        Row: {
          content: string
          created_at: string | null
          date_of_document: string | null
          folder_id: string | null
          household_id: string
          id: string
          notes: string | null
          original_image_uri: string | null
          property_id: string
          tags: string[] | null
          tenant_name: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          date_of_document?: string | null
          folder_id?: string | null
          household_id: string
          id?: string
          notes?: string | null
          original_image_uri?: string | null
          property_id: string
          tags?: string[] | null
          tenant_name?: string | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          date_of_document?: string | null
          folder_id?: string | null
          household_id?: string
          id?: string
          notes?: string | null
          original_image_uri?: string | null
          property_id?: string
          tags?: string[] | null
          tenant_name?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "lease_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_documents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lease_folders: {
        Row: {
          color: string | null
          created_at: string | null
          household_id: string
          id: string
          name: string
          property_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          household_id: string
          id?: string
          name: string
          property_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          household_id?: string
          id?: string
          name?: string
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lease_folders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lease_folders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          ac_capacitor_size: string | null
          ac_filter_size: string | null
          address: string
          appliance_info: string | null
          created_at: string | null
          current_value: number | null
          household_id: string
          id: string
          image_uri: string | null
          insurance_policy: string | null
          insurance_premium: number | null
          insurance_provider: string | null
          insurance_renewal_date: string | null
          lease_end: string | null
          lease_start: string | null
          monthly_rent: number | null
          mortgage_amount: number | null
          mortgage_payment: number | null
          mortgage_renewal_date: string | null
          name: string
          notes: string | null
          paint_colors_inside: string | null
          paint_colors_outside: string | null
          property_tax: number | null
          purchase_date: string | null
          purchase_price: number | null
          tenant_contact: string | null
          tenant_name: string | null
          type: string
          updated_at: string | null
          water_heater_info: string | null
        }
        Insert: {
          ac_capacitor_size?: string | null
          ac_filter_size?: string | null
          address: string
          appliance_info?: string | null
          created_at?: string | null
          current_value?: number | null
          household_id: string
          id?: string
          image_uri?: string | null
          insurance_policy?: string | null
          insurance_premium?: number | null
          insurance_provider?: string | null
          insurance_renewal_date?: string | null
          lease_end?: string | null
          lease_start?: string | null
          monthly_rent?: number | null
          mortgage_amount?: number | null
          mortgage_payment?: number | null
          mortgage_renewal_date?: string | null
          name: string
          notes?: string | null
          paint_colors_inside?: string | null
          paint_colors_outside?: string | null
          property_tax?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          tenant_contact?: string | null
          tenant_name?: string | null
          type?: string
          updated_at?: string | null
          water_heater_info?: string | null
        }
        Update: {
          ac_capacitor_size?: string | null
          ac_filter_size?: string | null
          address?: string
          appliance_info?: string | null
          created_at?: string | null
          current_value?: number | null
          household_id?: string
          id?: string
          image_uri?: string | null
          insurance_policy?: string | null
          insurance_premium?: number | null
          insurance_provider?: string | null
          insurance_renewal_date?: string | null
          lease_end?: string | null
          lease_start?: string | null
          monthly_rent?: number | null
          mortgage_amount?: number | null
          mortgage_payment?: number | null
          mortgage_renewal_date?: string | null
          name?: string
          notes?: string | null
          paint_colors_inside?: string | null
          paint_colors_outside?: string | null
          property_tax?: number | null
          purchase_date?: string | null
          purchase_price?: number | null
          tenant_contact?: string | null
          tenant_name?: string | null
          type?: string
          updated_at?: string | null
          water_heater_info?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      property_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          date: string
          household_id: string
          id: string
          property_id: string
          uri: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          date: string
          household_id: string
          id?: string
          property_id: string
          uri: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          date?: string
          household_id?: string
          id?: string
          property_id?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_photos_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_photos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string | null
          date: string
          household_id: string
          id: string
          notes: string | null
          property_id: string
          tags: string[] | null
          transaction_id: string | null
          updated_at: string | null
          uri: string
          vendor: string | null
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date: string
          household_id: string
          id?: string
          notes?: string | null
          property_id: string
          tags?: string[] | null
          transaction_id?: string | null
          updated_at?: string | null
          uri: string
          vendor?: string | null
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string | null
          date?: string
          household_id?: string
          id?: string
          notes?: string | null
          property_id?: string
          tags?: string[] | null
          transaction_id?: string | null
          updated_at?: string | null
          uri?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed: boolean | null
          created_at: string | null
          due_date: string
          household_id: string
          id: string
          notes: string | null
          property_id: string
          recipient_email: string | null
          recipient_phone: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          due_date: string
          household_id: string
          id?: string
          notes?: string | null
          property_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          due_date?: string
          household_id?: string
          id?: string
          notes?: string | null
          property_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          description: string
          household_id: string
          id: string
          property_id: string
          receipt_uri: string | null
          tags: string[] | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string | null
          date: string
          description: string
          household_id: string
          id?: string
          property_id: string
          receipt_uri?: string | null
          tags?: string[] | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          description?: string
          household_id?: string
          id?: string
          property_id?: string
          receipt_uri?: string | null
          tags?: string[] | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_household_member: { Args: { hhid: string }; Returns: boolean }
      is_household_owner: { Args: { hhid: string }; Returns: boolean }
      user_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
