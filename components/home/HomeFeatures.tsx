'use client'

import Link from 'next/link'
import { BarChart3, Zap, Calendar, RefreshCw, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: BarChart3,
    title: 'Intelligent Predictions',
    description: 'Conservative, baseline, and aggressive prediction modes that account for form, fixtures, team strength, and momentum',
    highlights: ['Form analysis', 'Fixture difficulty', 'Team strength', 'Position-specific caps']
  },
  {
    icon: Zap,
    title: 'Smart Optimisation',
    description: 'Auto-select your best XI for any gameweek and discover market leaders and differential picks',
    highlights: ['Best XI selection', 'Market leaders', 'Differential picks', 'Side-by-side comparison']
  },
  {
    icon: Calendar,
    title: 'Fixture Analysis',
    description: 'Multi-gameweek fixture difficulty visualisation with double gameweek planning and team strength differentials',
    highlights: ['Multi-GW planning', 'Fixture difficulty', 'Double gameweeks', 'Team differentials']
  },
  {
    icon: RefreshCw,
    title: 'Real-Time Sync',
    description: 'One-click FPL team import with latest player prices, ownership data, and live injury updates',
    highlights: ['One-click import', 'Live prices', 'Ownership data', 'Injury updates']
  }
]

export default function HomeFeatures() {
  return (
    <section id="features" className="relative py-24 sm:py-32 cv-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Everything You Need to{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
              Dominate FPL
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Powerful features designed to give you the competitive edge
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group relative bg-slate-900/50 border border-slate-800 rounded-3xl p-8 hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/10 backdrop-blur-sm overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-slate-700 group-hover:border-fuchsia-500/50">
                  <feature.icon className="w-7 h-7 text-fuchsia-400" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 mb-8 leading-relaxed">{feature.description}</p>

                <div className="grid grid-cols-2 gap-3">
                  {feature.highlights.map((highlight, hIdx) => (
                    <div key={hIdx} className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                      <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full group-hover:bg-fuchsia-500 transition-colors" />
                      {highlight}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/login" className="group inline-flex px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-lg border border-slate-700 transition-all duration-200 items-center gap-2 hover:scale-105">
            Start Using FPL Companion
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-fuchsia-400" />
          </Link>
        </div>
      </div>
    </section>
  )
}
