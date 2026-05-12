export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          asset_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          type: string
        }
        Insert: {
          asset_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          type: string
        }
        Update: {
          asset_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_telemetry: {
        Row: {
          asset_id: string
          fuel_level: number | null
          hours: number | null
          id: string
          next_service_hours: number | null
          recorded_at: string | null
        }
        Insert: {
          asset_id: string
          fuel_level?: number | null
          hours?: number | null
          id?: string
          next_service_hours?: number | null
          recorded_at?: string | null
        }
        Update: {
          asset_id?: string
          fuel_level?: number | null
          hours?: number | null
          id?: string
          next_service_hours?: number | null
          recorded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_telemetry_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          avg_hours_per_week: number | null
          brand: string | null
          created_at: string | null
          current_hours: number | null
          has_telemetry: boolean | null
          id: string
          location: string | null
          model: string | null
          name: string
          notes: string | null
          serial_number: string | null
          status: string | null
          type: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          avg_hours_per_week?: number | null
          brand?: string | null
          created_at?: string | null
          current_hours?: number | null
          has_telemetry?: boolean | null
          id?: string
          location?: string | null
          model?: string | null
          name: string
          notes?: string | null
          serial_number?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          avg_hours_per_week?: number | null
          brand?: string | null
          created_at?: string | null
          current_hours?: number | null
          has_telemetry?: boolean | null
          id?: string
          location?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          serial_number?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      liner_configs: {
        Row: {
          asset_id: string | null
          cows_count: number
          created_at: string | null
          id: string
          last_change_date: string
          liner_life_milkings: number | null
          milkings_per_day: number | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          cows_count: number
          created_at?: string | null
          id?: string
          last_change_date: string
          liner_life_milkings?: number | null
          milkings_per_day?: number | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          cows_count?: number
          created_at?: string | null
          id?: string
          last_change_date?: string
          liner_life_milkings?: number | null
          milkings_per_day?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liner_configs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_findings: {
        Row: {
          asset_id: string
          created_at: string | null
          description: string
          discovered_in_log_id: string | null
          follow_up_date: string | null
          id: string
          notes: string | null
          resolved_at: string | null
          severity: string | null
          status: string | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          description: string
          discovered_in_log_id?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          description?: string
          discovered_in_log_id?: string | null
          follow_up_date?: string | null
          id?: string
          notes?: string | null
          resolved_at?: string | null
          severity?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_findings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_findings_discovered_in_log_id_fkey"
            columns: ["discovered_in_log_id"]
            isOneToOne: false
            referencedRelation: "maintenance_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_logs: {
        Row: {
          asset_hours_at_service: number | null
          asset_id: string
          cost_estimate: number | null
          created_at: string | null
          description: string
          hours_spent: number | null
          id: string
          next_service_date: string | null
          parts_used: string[] | null
          performed_by: string | null
          performed_by_name: string | null
          status: string | null
          type: string
          voice_transcript: string | null
        }
        Insert: {
          asset_hours_at_service?: number | null
          asset_id: string
          cost_estimate?: number | null
          created_at?: string | null
          description: string
          hours_spent?: number | null
          id?: string
          next_service_date?: string | null
          parts_used?: string[] | null
          performed_by?: string | null
          performed_by_name?: string | null
          status?: string | null
          type: string
          voice_transcript?: string | null
        }
        Update: {
          asset_hours_at_service?: number | null
          asset_id?: string
          cost_estimate?: number | null
          created_at?: string | null
          description?: string
          hours_spent?: number | null
          id?: string
          next_service_date?: string | null
          parts_used?: string[] | null
          performed_by?: string | null
          performed_by_name?: string | null
          status?: string | null
          type?: string
          voice_transcript?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          asset_id: string
          calendar_interval_days: number | null
          created_at: string | null
          hours_interval: number | null
          id: string
          last_performed_at: string | null
          next_due_date: string | null
          next_due_hours: number | null
          notes: string | null
          snooze_until: string | null
          status: string | null
          subsystem: string
          title: string
        }
        Insert: {
          asset_id: string
          calendar_interval_days?: number | null
          created_at?: string | null
          hours_interval?: number | null
          id?: string
          last_performed_at?: string | null
          next_due_date?: string | null
          next_due_hours?: number | null
          notes?: string | null
          snooze_until?: string | null
          status?: string | null
          subsystem: string
          title: string
        }
        Update: {
          asset_id?: string
          calendar_interval_days?: number | null
          created_at?: string | null
          hours_interval?: number | null
          id?: string
          last_performed_at?: string | null
          next_due_date?: string | null
          next_due_hours?: number | null
          notes?: string | null
          snooze_until?: string | null
          status?: string | null
          subsystem?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedules_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_reports: {
        Row: {
          created_at: string | null
          finding_id: string | null
          id: string
          raw_audio_url: string | null
          transcript: string
          whatsapp_from: string
        }
        Insert: {
          created_at?: string | null
          finding_id?: string | null
          id?: string
          raw_audio_url?: string | null
          transcript: string
          whatsapp_from: string
        }
        Update: {
          created_at?: string | null
          finding_id?: string | null
          id?: string
          raw_audio_url?: string | null
          transcript?: string
          whatsapp_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_reports_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "maintenance_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      whatsapp_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          manager_phone: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_phone: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          manager_phone?: string
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
