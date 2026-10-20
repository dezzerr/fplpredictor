'use client'

import { ArrowLeft, Download, Shield, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function FPLConnectPage() {
  const router = useRouter()
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
          <h1 className="text-xl font-bold text-white">FPL Team Import</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-violet-500/20">
                <Download className="w-7 h-7 text-violet-300" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-white mb-1">Import your public FPL team</h2>
                <p className="text-sm text-slate-400">
                  Enter your Team ID to import your squad. FPL Companion does not collect FPL passwords or apply changes to FPL.
                </p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-800">
            <Link
              href="/import"
              className="w-full py-3 px-4 bg-gradient-brand-cta hover:opacity-90 text-white font-semibold rounded-lg transition-opacity inline-flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Import by Team ID
            </Link>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-4">
          {/* What you can do */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              What Team ID import does
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-2" />
                <span>Imports your current public FPL squad</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-2" />
                <span>Saves your Team ID to pre-fill future imports</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-2" />
                <span>Lets you plan changes locally without modifying FPL</span>
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
                <span>We do not collect your FPL password or store FPL session cookies</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2" />
                <span>Only public team data associated with the Team ID is imported</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
