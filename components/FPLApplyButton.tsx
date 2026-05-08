'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2, Loader2, Send, ShieldAlert, Link2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FPLConnectModal } from '@/components/FPLConnectModal'
import { useFPLConnection } from '@/hooks/useFPLConnection'
import { useSquadStore } from '@/store/squad'
import { cn } from '@/lib/utils'

type DiffItem = {
  type: 'captain' | 'vice' | 'lineup' | 'bench' | 'unsupported_transfer'
  label: string
  before?: string
  after?: string
}

type PreviewResponse = {
  success?: boolean
  managerId?: number
  deadline?: { eventId?: number; deadline?: string | null }
  preview?: {
    canApply: boolean
    changes: DiffItem[]
    unsupported: DiffItem[]
  }
  error?: string
  message?: string
}

type FPLApplyButtonProps = {
  className?: string
  compact?: boolean
  disabled?: boolean
}

function countSquadPlayers(squad: ReturnType<typeof useSquadStore.getState>['squad']) {
  return squad.starters.GK.length + squad.starters.DEF.length + squad.starters.MID.length + squad.starters.FWD.length + squad.bench.length
}

export function FPLApplyButton({ className, compact = false, disabled = false }: FPLApplyButtonProps) {
  const squad = useSquadStore((s) => s.squad)
  const { connected, loading, refresh: refreshConnection } = useFPLConnection()
  const [connectOpen, setConnectOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [applying, setApplying] = useState(false)

  const squadCount = useMemo(() => countSquadPlayers(squad), [squad])
  const canOpen = connected && squadCount === 15 && !disabled

  const loadPreview = async () => {
    setPreviewing(true)
    setPreview(null)
    try {
      const res = await fetch('/api/fpl-sync/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ squad, apply: false }),
      })
      const data = await res.json()
      setPreview(data)
      if (!res.ok) {
        toast.error(data?.error || 'Failed to preview FPL changes')
      }
    } catch {
      const message = 'Failed to preview FPL changes'
      setPreview({ error: message })
      toast.error(message)
    } finally {
      setPreviewing(false)
    }
  }

  const handleOpen = async () => {
    if (loading) return
    if (!connected) {
      setConnectOpen(true)
      return
    }
    if (squadCount !== 15) {
      toast.error('Import or complete your 15-player squad before applying to FPL')
      return
    }
    setDialogOpen(true)
    await loadPreview()
  }

  const handleApply = async () => {
    setApplying(true)
    try {
      const res = await fetch('/api/fpl-sync/picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ squad, apply: true }),
      })
      const data = await res.json()
      setPreview(data)
      if (!res.ok) {
        toast.error(data?.error || 'FPL rejected the update')
        return
      }
      toast.success(data?.message || 'FPL team updated successfully')
      setDialogOpen(false)
    } catch {
      toast.error('Failed to apply changes to FPL')
    } finally {
      setApplying(false)
    }
  }

  const changes = preview?.preview?.changes || []
  const unsupported = preview?.preview?.unsupported || []
  const hasNoChanges = preview?.preview && changes.length === 0 && unsupported.length === 0
  const canApply = Boolean(preview?.preview?.canApply && changes.length > 0 && !previewing && !applying)

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled || loading}
        className={cn(
          compact
            ? 'p-2 rounded-full bg-fuchsia-100 hover:bg-fuchsia-200 disabled:opacity-30 disabled:cursor-not-allowed'
            : 'px-4 py-2 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98] shadow-sm transition-colors flex items-center gap-1.5',
          className
        )}
        title={connected ? 'Apply lineup, captain and bench changes to FPL' : 'Connect your FPL account'}
      >
        {compact ? (
          <Send className="w-4 h-4 text-fuchsia-600" />
        ) : (
          <>
            <Send className="w-4 h-4 text-white" />
            <span className="text-xs font-semibold text-white">Apply to FPL</span>
          </>
        )}
      </button>

      <FPLConnectModal
        isOpen={connectOpen}
        onClose={() => setConnectOpen(false)}
        onSuccess={() => {
          void refreshConnection()
          setConnectOpen(false)
        }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply changes to FPL?</DialogTitle>
            <DialogDescription>
              We will submit lineup, bench order, captain and vice-captain changes to your official FPL team.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {previewing && (
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Checking your live FPL team...
              </div>
            )}

            {preview?.error && !preview.preview && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{preview.error}</span>
              </div>
            )}

            {hasNoChanges && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>Your local squad already matches your editable FPL team.</span>
              </div>
            )}

            {unsupported.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <ShieldAlert className="h-4 w-4" />
                  Transfers detected
                </div>
                <div className="space-y-1 text-sm text-amber-700">
                  {unsupported.map((item, index) => (
                    <div key={`${item.label}-${index}`}>{item.before || item.after || item.label}</div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-amber-700">
                  This first release only applies pick-team changes. Restore your live team or use FPL directly for transfers.
                </p>
              </div>
            )}

            {changes.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-900">
                  Changes to submit
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto p-3">
                  {changes.map((item, index) => (
                    <div key={`${item.type}-${index}`} className="rounded-md bg-slate-50 p-2 text-sm">
                      <div className="font-medium text-slate-900">{item.label}</div>
                      {item.before && <div className="text-xs text-slate-500">From: {item.before}</div>}
                      {item.after && <div className="text-xs text-slate-700">To: {item.after}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              <Link2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>Transfers and chip activation are intentionally blocked in this first release. You will always see this confirmation before we submit anything to FPL.</span>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!canApply}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {applying && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm & Apply
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
