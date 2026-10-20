'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSquadStore } from '@/store/squad'
import { toast } from 'sonner'

export function useSquadSave() {
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const squad = useSquadStore((state) => state.squad)
  const teamRatingForWeek = useSquadStore((state) => state.teamRatingForWeek)
  const gwRatingForWeek = useSquadStore((state) => state.gwRatingForWeek)
  const totalExpForWeek = useSquadStore((state) => state.totalExpForWeek)
  const replaceSquad = useSquadStore((state) => state.replaceSquad)
  const setBank = useSquadStore((state) => state.setBank)
  const seasonKey = useSquadStore((state) => state.seasonKey)

  const saveSquad = async (gameweek: number, squadName?: string) => {
    setSaving(true)
    try {
      if (!seasonKey) {
        toast.error('Live FPL season data is still loading. Please try again in a moment.')
        return false
      }
      const supabase = createClient()
      
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Please sign in to save squads')
        return false
      }

      // Generate squad name if not provided
      const name = squadName || `GW${gameweek} Squad`
      
      // Calculate predicted points for this gameweek
      const predictedPoints = totalExpForWeek(0) // Current gameweek offset

      // First, set all other squads for this gameweek as inactive
      await supabase
        .from('squads')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('gameweek', gameweek)
        .eq('season_key', seasonKey)

      // Save the new squad
      const { error } = await supabase
        .from('squads')
        .insert({
          user_id: user.id,
          name,
          squad_data: squad,
          bank: squad.bank,
          gameweek,
          season_key: seasonKey,
          is_active: true,
        })

      if (error) {
        console.error('Save error:', error)
        toast.error('Failed to save squad')
        return false
      }

      // Also save to squad history for tracking
      // Use weekOffset 0 for current gameweek (squad is always saved for immediate use)
      await supabase
        .from('squad_history')
        .upsert({
          user_id: user.id,
          season_key: seasonKey,
          gameweek,
          squad_data: squad,
          predicted_points: predictedPoints,
          team_rating: teamRatingForWeek(0),
          gw_rating: gwRatingForWeek(0),
        }, {
          onConflict: 'user_id,season_key,gameweek'
        })

      toast.success(`Squad saved for GW${gameweek}!`)
      return true
    } catch (error) {
      console.error('Save error:', error)
      toast.error('Failed to save squad')
      return false
    } finally {
      setSaving(false)
    }
  }

  const loadSquad = async (gameweek: number) => {
    setLoading(true)
    try {
      if (!seasonKey) {
        toast.error('Live FPL season data is still loading. Please try again in a moment.')
        return false
      }
      const supabase = createClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        toast.error('Please sign in to load squads')
        return false
      }

      const { data, error } = await supabase
        .from('squads')
        .select('squad_data, bank, name')
        .eq('user_id', user.id)
        .eq('gameweek', gameweek)
        .eq('season_key', seasonKey)
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          toast.info(`No saved squad found for GW${gameweek}`)
        } else {
          toast.error('Failed to load squad')
        }
        return false
      }

      if (data) {
        // Update the squad store
        replaceSquad(data.squad_data)
        setBank(data.bank)
        toast.success(`Loaded ${data.name}`)
        return true
      }

      return false
    } catch (error) {
      console.error('Load error:', error)
      toast.error('Failed to load squad')
      return false
    } finally {
      setLoading(false)
    }
  }

  const getSavedSquads = async () => {
    try {
      if (!seasonKey) return []
      const supabase = createClient()
      
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) return []

      const { data, error } = await supabase
        .from('squads')
        .select('id, name, gameweek, created_at, is_active')
        .eq('user_id', user.id)
        .eq('season_key', seasonKey)
        .order('gameweek', { ascending: false })

      if (error) {
        console.error('Error fetching squads:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error fetching squads:', error)
      return []
    }
  }

  return {
    saveSquad,
    loadSquad,
    getSavedSquads,
    saving,
    loading,
  }
}
