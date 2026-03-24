'use client'

import { useState, useEffect, useCallback } from 'react'

interface FPLConnectionStatus {
  connected: boolean
  managerId: number | null
  expiresAt: string | null
  loading: boolean
  error: string | null
}

interface ConnectResult {
  success: boolean
  error?: string
  teamName?: string
  playerName?: string
}

interface UseFPLConnectionReturn extends FPLConnectionStatus {
  connect: (teamId: string) => Promise<ConnectResult>
  disconnect: () => Promise<boolean>
  refresh: () => Promise<void>
}

export function useFPLConnection(): UseFPLConnectionReturn {
  const [status, setStatus] = useState<FPLConnectionStatus>({
    connected: false,
    managerId: null,
    expiresAt: null,
    loading: true,
    error: null,
  })

  // Check connection status on mount
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/fpl-auth/status', { credentials: 'include' })
      const data = await res.json()
      
      setStatus({
        connected: data.connected || false,
        managerId: data.managerId || null,
        expiresAt: data.expiresAt || null,
        loading: false,
        error: null,
      })
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to check FPL connection status',
      }))
    }
  }, [])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  // Connect to FPL via Team ID
  const connect = useCallback(async (teamId: string): Promise<ConnectResult> => {
    setStatus(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const res = await fetch('/api/fpl-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to connect to FPL',
        }))
        return { success: false, error: data.error }
      }
      
      // Refresh status after successful connection
      await checkStatus()
      return { success: true, teamName: data.teamName, playerName: data.playerName }
    } catch (error) {
      const errorMessage = 'Failed to connect to FPL'
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }))
      return { success: false, error: errorMessage }
    }
  }, [checkStatus])

  // Disconnect from FPL
  const disconnect = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const res = await fetch('/api/fpl-auth/disconnect', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (!res.ok) {
        const data = await res.json()
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: data.error || 'Failed to disconnect',
        }))
        return false
      }
      
      setStatus({
        connected: false,
        managerId: null,
        expiresAt: null,
        loading: false,
        error: null,
      })
      return true
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to disconnect from FPL',
      }))
      return false
    }
  }, [])

  return {
    ...status,
    connect,
    disconnect,
    refresh: checkStatus,
  }
}
