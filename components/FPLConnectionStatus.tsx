'use client'

import { useState } from 'react'
import { Link2, Link2Off, Loader2, ChevronDown } from 'lucide-react'
import { useFPLConnection } from '@/hooks/useFPLConnection'
import { FPLConnectModal } from './FPLConnectModal'

export function FPLConnectionStatus() {
  const { connected, managerId, loading, disconnect, refresh } = useFPLConnection()
  const [showModal, setShowModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const handleDisconnect = async () => {
    setDisconnecting(true)
    await disconnect()
    setDisconnecting(false)
    setShowDropdown(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        <span className="text-sm text-slate-400">Checking...</span>
      </div>
    )
  }

  if (connected) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-colors"
        >
          <Link2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-300 font-medium">FPL Connected</span>
          <ChevronDown className="w-4 h-4 text-emerald-400" />
        </button>

        {showDropdown && (
          <>
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700">
                <p className="text-sm text-slate-400">Connected as</p>
                <p className="text-sm font-medium text-white">Team ID: {managerId}</p>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700/50 transition-colors flex items-center gap-2"
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2Off className="w-4 h-4" />
                )}
                Disconnect FPL Account
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg hover:bg-fuchsia-500/20 transition-colors"
      >
        <Link2 className="w-4 h-4 text-fuchsia-400" />
        <span className="text-sm text-fuchsia-300 font-medium">Connect FPL</span>
      </button>

      <FPLConnectModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          // Optionally trigger a squad refresh here
          void refresh()
          setShowModal(false)
        }}
      />
    </>
  )
}
