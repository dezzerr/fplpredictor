'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { parseFplEntryId } from '@/lib/fplEntry'

export type FPLManagerLookupCandidate = {
  entryId: number
  playerName: string
  teamName: string
  overallRank?: number
  overallPoints?: number
  eventTotal?: number
}

type ManagerResponse = Omit<FPLManagerLookupCandidate, 'entryId' | 'eventTotal'> & { error?: string }

interface FPLManagerLookupProps {
  onSelect: (entryId: string, candidate: FPLManagerLookupCandidate) => void
  theme?: 'light' | 'dark'
  className?: string
}

export function FPLManagerLookup({ onSelect, theme = 'light', className }: FPLManagerLookupProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [candidate, setCandidate] = useState<FPLManagerLookupCandidate | null>(null)
  const [error, setError] = useState<string | null>(null)

  const palette = useMemo(() => {
    if (theme === 'dark') {
      return {
        input: 'w-full pl-10 pr-3 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent',
        helper: 'text-xs text-slate-400',
        panel: 'rounded-lg border border-slate-700 bg-slate-900/60',
        row: 'w-full text-left px-3 py-2.5 hover:bg-slate-800/80 transition-colors border-b border-slate-800 last:border-b-0',
        rowActive: 'bg-violet-500/10',
        title: 'text-sm font-medium text-white',
        subtitle: 'text-xs text-slate-400',
        meta: 'text-xs text-slate-300',
        warning: 'rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200',
        error: 'rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300',
      }
    }

    return {
      input: 'w-full pl-10 pr-3 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500',
      helper: 'text-xs text-slate-500',
      panel: 'rounded-lg border border-slate-200 bg-white',
      row: 'w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0',
      rowActive: 'bg-violet-50',
      title: 'text-sm font-medium text-slate-900',
      subtitle: 'text-xs text-slate-500',
      meta: 'text-xs text-slate-700',
      warning: 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800',
      error: 'rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700',
    }
  }, [theme])

  const lookup = async (event: FormEvent) => {
    event.preventDefault()
    const entryId = parseFplEntryId(value)
    setCandidate(null)
    setError(null)
    if (!entryId) {
      setError('Enter an FPL Team ID or paste an official FPL entry URL.')
      return
    }
    setLoading(true)
    try {
      const response = await fetch(`/api/manager?entryId=${entryId}`, { cache: 'no-store' })
      const data = await response.json() as ManagerResponse
      if (!response.ok) throw new Error(data.error || 'Could not verify this FPL team right now.')
      setCandidate({ entryId: Number(entryId), playerName: data.playerName || 'Unknown Manager', teamName: data.teamName || 'Unknown Team', overallRank: data.overallRank, overallPoints: data.overallPoints })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify this FPL team right now.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cn('space-y-2', className)} onSubmit={lookup}>
      <div className="relative">
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
            theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
          )}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setCandidate(null)
            setError(null)
          }}
          placeholder="FPL Team ID or official entry URL"
          className={palette.input}
          autoComplete="off"
        />
      </div>

      <p className={palette.helper}>Paste an official FPL entry URL or enter its Team ID to verify the manager before importing.</p>

      <button type="submit" disabled={loading} className={cn('rounded-md px-3 py-2 text-sm font-medium', theme === 'dark' ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-violet-600 text-white hover:bg-violet-700')}>
        {loading ? 'Checking…' : 'Find FPL Team'}
      </button>

      {loading && (
        <div className={cn('flex items-center gap-2 text-xs', palette.helper)}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Checking official FPL data...
        </div>
      )}

      {error && <div className={palette.error}>{error}</div>}

      {candidate && (
        <div className={palette.panel}>
          <div className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div><div className={palette.title}>{candidate.playerName}</div><div className={palette.subtitle}>{candidate.teamName}</div></div>
            <div className="text-right"><div className={palette.meta}>ID {candidate.entryId}</div>{typeof candidate.overallRank === 'number' && <div className={palette.subtitle}>OR {candidate.overallRank.toLocaleString()}</div>}</div>
          </div>
          <button type="button" onClick={() => onSelect(String(candidate.entryId), candidate)} className={cn('mx-3 mb-3 rounded-md px-3 py-2 text-sm font-medium', theme === 'dark' ? 'bg-violet-600 text-white hover:bg-violet-500' : 'bg-violet-600 text-white hover:bg-violet-700')}>Use this team</button>
        </div>
      )}
    </form>
  )
}
