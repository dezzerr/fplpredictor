export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          fpl_team_id: number | null
          username: string | null
          email: string | null
          preset: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          fpl_team_id?: number | null
          username?: string | null
          email?: string | null
          preset?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fpl_team_id?: number | null
          username?: string | null
          email?: string | null
          preset?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      squads: {
        Row: {
          id: string
          user_id: string
          name: string
          squad_data: Json
          bank: number
          gameweek: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          squad_data: Json
          bank?: number
          gameweek?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          squad_data?: Json
          bank?: number
          gameweek?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      squad_history: {
        Row: {
          id: string
          user_id: string
          gameweek: number
          squad_data: Json
          predicted_points: number | null
          actual_points: number | null
          team_rating: number | null
          gw_rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          gameweek: number
          squad_data: Json
          predicted_points?: number | null
          actual_points?: number | null
          team_rating?: number | null
          gw_rating?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          gameweek?: number
          squad_data?: Json
          predicted_points?: number | null
          actual_points?: number | null
          team_rating?: number | null
          gw_rating?: number | null
          created_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          id: string
          user_id: string
          player_id: string
          player_name: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          player_id: string
          player_name: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          player_id?: string
          player_name?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      fpl_sessions: {
        Row: {
          id: string
          user_id: string
          manager_id: number
          encrypted_cookies: string
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          manager_id: number
          encrypted_cookies: string
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          manager_id?: number
          encrypted_cookies?: string
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      fpl_sync_audit: {
        Row: {
          id: string
          user_id: string
          manager_id: number
          action: string
          event_id: number | null
          summary: Json | null
          status_code: number | null
          success: boolean
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          manager_id: number
          action: string
          event_id?: number | null
          summary?: Json | null
          status_code?: number | null
          success?: boolean
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          manager_id?: number
          action?: string
          event_id?: number | null
          summary?: Json | null
          status_code?: number | null
          success?: boolean
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
      player_signals: {
        Row: {
          id: string
          player_name: string
          player_id: string | null
          team: string
          gameweek: number
          signal: string
          adjustment: number | null
          confidence: string | null
          reason: string | null
          source_type: string | null
          source_label: string | null
          created_at: string
        }
        Insert: {
          id?: string
          player_name: string
          player_id?: string | null
          team: string
          gameweek: number
          signal: string
          adjustment?: number | null
          confidence?: string | null
          reason?: string | null
          source_type?: string | null
          source_label?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          player_name?: string
          player_id?: string | null
          team?: string
          gameweek?: number
          signal?: string
          adjustment?: number | null
          confidence?: string | null
          reason?: string | null
          source_type?: string | null
          source_label?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
