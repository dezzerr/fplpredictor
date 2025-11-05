'use client'

import Link from 'next/link'
import { ArrowRight, TrendingUp } from 'lucide-react'

export default function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 via-transparent to-cyan-600/20" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl" />

      {/* Header/Navigation */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-6 h-6 text-white transform rotate-[-45deg]" />
            </div>
            <span className="text-2xl font-bold text-white">FPL Companion</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-6 py-2 text-white hover:text-fuchsia-300 font-medium transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="px-6 py-2 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white rounded-lg font-semibold shadow-lg shadow-fuchsia-500/30 transition-all duration-200">
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 sm:pt-16 sm:pb-32">
        {/* Announcement badge */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-full text-fuchsia-300 text-sm">
            <TrendingUp className="w-4 h-4" />
            <span>Powered by AI & Real-Time FPL Data</span>
          </div>
        </div>

        {/* Main content */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Make Smarter FPL Decisions with{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
              AI-Powered Predictions
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 mb-8 leading-relaxed">
            Advanced points predictions, optimal squad selection, and real-time fixture analysis—all in one place
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link href="/" className="group px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white rounded-lg font-semibold text-lg shadow-lg shadow-fuchsia-500/50 transition-all duration-200 flex items-center gap-2">
              Import Your FPL Team
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/" className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold text-lg border border-slate-700 transition-colors duration-200">
              Try It Free
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-4xl font-bold text-white mb-2">95%</div>
              <div className="text-slate-400">Prediction Accuracy</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-4xl font-bold text-white mb-2">15min</div>
              <div className="text-slate-400">Update Frequency</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
              <div className="text-4xl font-bold text-white mb-2">100%</div>
              <div className="text-slate-400">Free Forever</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
