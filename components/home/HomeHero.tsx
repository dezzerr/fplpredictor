'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Shield, Zap } from 'lucide-react'

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden pt-6 pb-20 lg:pb-24">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-slate-950 to-slate-950" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-[128px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px]" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]" />

      {/* Header/Navigation — handled by PublicNavbar in parent, add spacing */}
      <div className="relative mb-16" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            {/* Announcement badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-sm font-medium mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
              </span>
              Now with Live GW Updates
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              Win Your League with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
                AI Predictions
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Stop guessing. Start optimizing. Get advanced points predictions, automated squad planning, and real-time transfer insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link href="/login" className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-fuchsia-500/25 transition-all duration-200 flex items-center justify-center gap-2 group">
                Start Winning
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href={'/blog' as Route} className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl font-semibold text-lg border border-slate-700 backdrop-blur-sm transition-colors duration-200">
                Read the Blog
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center lg:justify-start gap-8 text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span className="text-sm">Real-time Data</span>
              </div>
            </div>
          </div>

          {/* Abstract UI Mockup */}
          <div className="relative lg:h-[600px] w-full flex items-center justify-center [perspective:1000px]">
            <div className="relative w-full max-w-lg aspect-square lg:aspect-auto lg:h-[500px] bg-gradient-to-tr from-slate-800/50 to-slate-900/50 rounded-3xl border border-slate-700/50 p-6 backdrop-blur-xl shadow-2xl lg:[transform:rotateY(12deg)_rotateX(6deg)] transition-transform duration-500 hover:[transform:rotateY(0deg)_rotateX(0deg)]">
              {/* Mock Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700/50" />
                  <div className="space-y-2">
                    <div className="h-2 w-24 bg-slate-700/50 rounded" />
                    <div className="h-2 w-16 bg-slate-700/30 rounded" />
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                  GW Active
                </div>
              </div>

              {/* Mock Pitch */}
              <div className="relative w-full h-[300px] bg-green-900/20 rounded-2xl border border-green-500/10 overflow-hidden mb-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500/5 to-transparent" />
                {/* Mock Players */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                </div>
                <div className="absolute top-24 left-1/2 -translate-x-1/2 flex gap-8">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                </div>
                 <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-8">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                  <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600" />
                </div>
              </div>

              {/* Mock Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                   <div className="h-2 w-8 bg-slate-600/50 rounded mb-2" />
                   <div className="h-4 w-12 bg-fuchsia-500/50 rounded" />
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                   <div className="h-2 w-8 bg-slate-600/50 rounded mb-2" />
                   <div className="h-4 w-12 bg-indigo-500/50 rounded" />
                </div>
                <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                   <div className="h-2 w-8 bg-slate-600/50 rounded mb-2" />
                   <div className="h-4 w-12 bg-cyan-500/50 rounded" />
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -right-4 top-20 p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl animate-bounce duration-[3000ms] will-change-transform">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold">H</div>
                <div>
                  <div className="text-xs text-slate-400">Haaland</div>
                  <div className="text-sm font-bold text-green-400">+12.5 pts</div>
                </div>
              </div>
            </div>

             <div className="absolute -left-8 bottom-40 p-4 bg-slate-800 rounded-xl border border-slate-700 shadow-xl animate-bounce duration-[4000ms] will-change-transform">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">S</div>
                <div>
                  <div className="text-xs text-slate-400">Salah</div>
                  <div className="text-sm font-bold text-blue-400">Cap Pick</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
