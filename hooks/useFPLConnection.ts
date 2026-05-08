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
  connect: (email: string, password: string) => Promise<ConnectResult>
  disconnect: () => Promise<boolean>
  refresh: () => Promise<void>
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    return {} as T
  }
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
      const res = await fetch('/api/fpl-sync/status', { credentials: 'include' })
      const data = await readJson<{
        connected?: boolean
        managerId?: number
        expiresAt?: string
        error?: string
        reason?: string
      }>(res)
      const isConnected = Boolean(data.connected)

      if (!res.ok) {
        setStatus({
          connected: false,
          managerId: null,
          expiresAt: null,
          loading: false,
          error: data.error || 'Failed to check FPL connection status',
        })
        return
      }
      
      setStatus({
        connected: isConnected,
        managerId: typeof data.managerId === 'number' ? data.managerId : null,
        expiresAt: typeof data.expiresAt === 'string' ? data.expiresAt : null,
        loading: false,
        error: isConnected || data.reason === 'not_authenticated' || data.reason === 'no_valid_fpl_session'
          ? null
          : data.error || null,
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

  // Connect to FPL using a real authenticated FPL session
  const connect = useCallback(async (email: string, password: string): Promise<ConnectResult> => {
    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      return { success: false, error: 'FPL email and password are required' }
    }

    setStatus(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const res = await fetch('/api/fpl-sync/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, password }),
      })
      
      const data = await readJson<{
        error?: string
        teamName?: string
        playerName?: string
      }>(res)
      
      if (!res.ok) {
        const message = data.error || 'Failed to connect to FPL'
        setStatus(prev => ({
          ...prev,
          loading: false,
          error: message,
        }))
        return { success: false, error: message }
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
      const res = await fetch('/api/fpl-sync/logout', {
        method: 'POST',
        credentials: 'include',
      })
      
      if (!res.ok) {
        const data = await readJson<{ error?: string }>(res)
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
