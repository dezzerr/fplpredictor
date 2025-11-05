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
      }
    }
  }
}
