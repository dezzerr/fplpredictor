'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export type FPLManagerLookupCandidate = {
  entryId: number
  playerName: string
  teamName: string
  overallRank?: number
  overallPoints?: number
  eventTotal?: number
}

type FPLManagerLookupResponse = {
  available: boolean
  query: string
  candidates: FPLManagerLookupCandidate[]
  message?: string
  reason?: 'unsupported' | 'temporary'
}

interface FPLManagerLookupProps {
  onSelect: (entryId: string, candidate: FPLManagerLookupCandidate) => void
  theme?: 'light' | 'dark'
  className?: string
}

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 350

export function FPLManagerLookup({ onSelect, theme = 'light', className }: FPLManagerLookupProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [candidates, setCandidates] = useState<FPLManagerLookupCandidate[]>([])
  const [error, setError] = useState<string | null>(null)
  const [unavailableMessage, setUnavailableMessage] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null)

  const palette = useMemo(() => {
    if (theme === 'dark') {
      return {
        input: 'w-full pl-10 pr-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent',
        helper: 'text-xs text-slate-400',
        panel: 'rounded-lg border border-slate-700 bg-slate-900/60',
        row: 'w-full text-left px-3 py-2.5 hover:bg-slate-800/80 transition-colors border-b border-slate-800 last:border-b-0',
        rowActive: 'bg-fuchsia-500/10',
        title: 'text-sm font-medium text-white',
        subtitle: 'text-xs text-slate-400',
        meta: 'text-xs text-slate-300',
        warning: 'rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200',
        error: 'rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300',
      }
    }

    return {
      input: 'w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
      helper: 'text-xs text-slate-500',
      panel: 'rounded-lg border border-slate-200 bg-white',
      row: 'w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0',
      rowActive: 'bg-indigo-50',
      title: 'text-sm font-medium text-slate-900',
      subtitle: 'text-xs text-slate-500',
      meta: 'text-xs text-slate-700',
      warning: 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800',
      error: 'rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700',
    }
  }, [theme])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [query])

  useEffect(() => {
    if (debouncedQuery.length < MIN_QUERY_LENGTH) {
      setLoading(false)
      setCandidates([])
      setError(null)
      setUnavailableMessage(null)
      setHasSearched(false)
      return
    }

    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)
      setUnavailableMessage(null)

      try {
        const response = await fetch(
          `/api/fpl-auth/lookup?q=${encodeURIComponent(debouncedQuery)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        )

        const data = (await response.json()) as FPLManagerLookupResponse

        if (!response.ok) {
          setCandidates([])
          setError(data.message || 'Could not search managers right now.')
          setHasSearched(true)
          return
        }

        if (!data.available) {
          setCandidates([])
          setUnavailableMessage(
            data.message ||
              'Manager name lookup is unavailable from official FPL endpoints. Please enter Team ID directly.'
          )
          setHasSearched(true)
          return
        }

        setCandidates(Array.isArray(data.candidates) ? data.candidates : [])
        setHasSearched(true)
      } catch (err: unknown) {
        if (controller.signal.aborted) return
        setCandidates([])
        setError(err instanceof Error ? err.message : 'Could not search managers right now.')
        setHasSearched(true)
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => controller.abort()
  }, [debouncedQuery])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          )}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelectedEntryId(null)
          }}
          placeholder="Search manager by name"
          className={palette.input}
          autoComplete="off"
        />
      </div>

      <p className={palette.helper}>
        Type at least {MIN_QUERY_LENGTH} characters, then choose a manager to auto-fill Team ID.
      </p>

      {loading && (
        <div className={cn('flex items-center gap-2 text-xs', palette.helper)}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Searching official FPL endpoints...
        </div>
      )}

      {error && <div className={palette.error}>{error}</div>}

      {unavailableMessage && <div className={palette.warning}>{unavailableMessage}</div>}

      {!loading && !error && !unavailableMessage && hasSearched && candidates.length === 0 && (
        <div className={palette.helper}>No matching managers found.</div>
      )}

      {!loading && !error && !unavailableMessage && candidates.length > 0 && (
        <div className={palette.panel}>
          {candidates.map((candidate) => (
            <button
              key={candidate.entryId}
              type="button"
              onClick={() => {
                setSelectedEntryId(candidate.entryId)
                onSelect(String(candidate.entryId), candidate)
              }}
              className={cn(
                palette.row,
                selectedEntryId === candidate.entryId && palette.rowActive
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={palette.title}>{candidate.playerName}</div>
                  <div className={palette.subtitle}>{candidate.teamName}</div>
                </div>
                <div className="text-right">
                  <div className={palette.meta}>ID {candidate.entryId}</div>
                  {typeof candidate.overallRank === 'number' && (
                    <div className={palette.subtitle}>OR {candidate.overallRank.toLocaleString()}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
