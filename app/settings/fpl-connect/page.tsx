'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Link2, Link2Off, Shield, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useFPLConnection } from '@/hooks/useFPLConnection'
import { FPLConnectModal } from '@/components/FPLConnectModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function FPLConnectPage() {
  const router = useRouter()
  const { connected, managerId, expiresAt, loading, disconnect, refresh } = useFPLConnection()
  const [showModal, setShowModal] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
  }, [])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    await disconnect()
    setDisconnecting(false)
  }

  const formatExpiryDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Show loading state while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Sign In Required</h1>
          <p className="text-slate-400 mb-6">
            You need to sign in to your FPL Companion account before connecting your FPL account.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-fuchsia-500 hover:to-cyan-500 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-white">FPL Account Connection</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Connection Status Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                connected 
                  ? 'bg-emerald-500/20' 
                  : 'bg-slate-800'
              }`}>
                {loading ? (
                  <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
                ) : connected ? (
                  <Link2 className="w-7 h-7 text-emerald-400" />
                ) : (
                  <Link2Off className="w-7 h-7 text-slate-500" />
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">
                  {loading ? 'Checking connection...' : connected ? 'FPL Account Connected' : 'Not Connected'}
                </h2>
                <p className="text-sm text-slate-400">
                  {loading 
                    ? 'Please wait while we check your connection status.'
                    : connected 
                      ? 'Your FPL account is linked. You can sync your team and apply changes directly.'
                      : 'Connect your FPL account to sync your team and apply changes directly to Fantasy Premier League.'
                  }
                </p>
              </div>
            </div>

            {/* Connected Details */}
            {connected && !loading && (
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Team ID</span>
                  <span className="text-sm font-mono text-white">{managerId}</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-800">
            {connected ? (
              <div className="flex gap-3">
                <button
                  onClick={() => refresh()}
                  className="flex-1 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Status
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="flex-1 py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 border border-red-500/30"
                >
                  {disconnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2Off className="w-4 h-4" />
                  )}
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-3 px-4 bg-gradient-to-r from-fuchsia-600 to-cyan-600 hover:from-fuchsia-500 hover:to-cyan-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Link2 className="w-5 h-5" />
                Connect FPL Account
              </button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-4">
          {/* What you can do */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              What you can do with FPL Connection
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-2" />
                <span>Automatically import your current FPL squad</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-2" />
                <span>Apply transfers directly to your FPL team</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-2" />
                <span>Sync captain and substitution changes</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-2" />
                <span>Keep your app and FPL in perfect sync</span>
              </li>
            </ul>
          </div>

          {/* Security Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Security & Privacy
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2" />
                <span>No password required — we only use your public FPL Team ID</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2" />
                <span>Your Team ID is publicly available on the FPL website</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2" />
                <span>You can disconnect at any time</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2" />
                <span>Connection never expires — no need to re-authenticate</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Connect Modal */}
      <FPLConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => refresh()}
      />
    </div>
  )
}
