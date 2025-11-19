'use client'

import { Download, Search, Target } from 'lucide-react'

const steps = [
  {
    icon: Download,
    number: '01',
    title: 'Import',
    description: 'Enter your FPL Team ID for instant sync with your squad'
  },
  {
    icon: Search,
    number: '02',
    title: 'Analyse',
    description: 'See predicted points, ratings, and detailed player insights'
  },
  {
    icon: Target,
    number: '03',
    title: 'Optimise',
    description: 'Auto-select your best XI or explore optimal transfers'
  }
]

export default function HomeHowItWorks() {
  return (
    <section className="relative py-20 sm:py-24 bg-slate-950/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
            Get Started in{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-indigo-400">
              3 Simple Steps
            </span>
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From import to optimisation in seconds
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection lines (desktop only) */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="relative z-10 bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center hover:border-fuchsia-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-fuchsia-500/5 group">
                {/* Number badge */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-white font-mono text-sm shadow-lg group-hover:border-fuchsia-500/50 group-hover:text-fuchsia-400 transition-colors">
                  {step.number}
                </div>

                <div className="w-20 h-20 bg-slate-800/50 border border-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-6 mt-4 group-hover:scale-110 transition-transform duration-300 group-hover:border-fuchsia-500/30 group-hover:bg-fuchsia-500/10">
                  <step.icon className="w-10 h-10 text-slate-400 group-hover:text-fuchsia-400 transition-colors" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
