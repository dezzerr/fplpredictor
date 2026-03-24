'use client'

import { useState } from 'react'
import { X, Loader2, Link2, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react'
import { useFPLConnection } from '@/hooks/useFPLConnection'

interface FPLConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function FPLConnectModal({ isOpen, onClose, onSuccess }: FPLConnectModalProps) {
  const [teamId, setTeamId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [successInfo, setSuccessInfo] = useState<{ teamName?: string; playerName?: string }>({})
  
  const { connect } = useFPLConnection()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await connect(teamId.trim())
      
      if (result.success) {
        setSuccess(true)
        setSuccessInfo({ teamName: result.teamName, playerName: result.playerName })
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        setError(result.error || 'Failed to connect to FPL')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Connect FPL Account</h2>
              <p className="text-sm text-slate-400">Link your team using your FPL Team ID</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center py-8">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Connected!</h3>
              <p className="text-slate-400 text-center">
                {successInfo.teamName 
                  ? <>Successfully linked to <strong className="text-white">{successInfo.teamName}</strong>{successInfo.playerName ? ` (${successInfo.playerName})` : ''}</>
                  : 'Your FPL account has been successfully connected.'
                }
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              {/* Team ID field */}
              <div>
                <label htmlFor="fpl-team-id" className="block text-sm font-medium text-slate-300 mb-2">
                  FPL Team ID
                </label>
                <input
                  id="fpl-team-id"
                  type="text"
                  inputMode="numeric"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1234567"
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 focus:border-transparent transition-all"
                />
              </div>

              {/* How to find your Team ID */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-400">
                    <p className="font-medium text-slate-300 mb-1">How to find your Team ID</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to <strong className="text-slate-300">fantasy.premierleague.com</strong></li>
                      <li>Click <strong className="text-slate-300">Points</strong> or <strong className="text-slate-300">Pick Team</strong></li>
                      <li>Your Team ID is the number in the URL: <span className="text-cyan-400">/entry/<strong>1234567</strong>/event/</span></li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || !teamId.trim()}
                className="w-full py-3 px-4 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-5 h-5" />
                    Connect FPL Account
                  </>
                )}
              </button>

              {/* Privacy note */}
              <p className="text-xs text-slate-500 text-center">
                No password required. We only use your public FPL Team ID to import your squad data.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
