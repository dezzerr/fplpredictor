'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSquadStore } from '@/store/squad'

interface UseSavedTeamIdReturn {
  savedTeamId: number | null
  loading: boolean
  autoLoadSquad: () => Promise<boolean>
  clearSavedTeamId: () => Promise<boolean>
}

export function useSavedTeamId(): UseSavedTeamIdReturn {
  const [savedTeamId, setSavedTeamId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const initialize = useSquadStore((s) => s.initialize)
  const lastImport = useSquadStore((s) => s.lastImport)

  // Load saved FPL team ID from profile on mount
  useEffect(() => {
    const loadSavedTeamId = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('fpl_team_id')
          .eq('id', user.id)
          .single()

        if (profile?.fpl_team_id) {
          setSavedTeamId(profile.fpl_team_id)
        }
      } catch (error) {
        console.error('Error loading saved team ID:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSavedTeamId()
  }, [])

  // Auto-load squad from saved team ID
  const autoLoadSquad = useCallback(async (): Promise<boolean> => {
    if (!savedTeamId) return false
    
    // Skip if already imported this session
    if (lastImport?.entryId === savedTeamId.toString()) {
      return true
    }

    try {
      const result = await initialize({ 
        entryId: savedTeamId.toString(), 
        preset: 'baseline' 
      })
      return result.ok
    } catch (error) {
      console.error('Error auto-loading squad:', error)
      return false
    }
  }, [savedTeamId, lastImport, initialize])

  // Clear saved team ID from profile
  const clearSavedTeamId = useCallback(async (): Promise<boolean> => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { error } = await supabase
        .from('profiles')
        .update({ fpl_team_id: null })
        .eq('id', user.id)

      if (error) {
        console.error('Error clearing saved team ID:', error)
        return false
      }

      setSavedTeamId(null)
      return true
    } catch (error) {
      console.error('Error clearing saved team ID:', error)
      return false
    }
  }, [])

  return {
    savedTeamId,
    loading,
    autoLoadSquad,
    clearSavedTeamId,
  }
}
