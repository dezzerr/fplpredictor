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

export default function LandingHowItWorks() {
  return (
    <section className="relative py-16 sm:py-20 bg-gradient-to-b from-cyan-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Get Started in{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
              3 Simple Steps
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            From import to optimisation in seconds
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connection lines */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-fuchsia-500/30 via-cyan-500/30 to-fuchsia-500/30" />

          {steps.map((step, idx) => (
            <div key={idx} className="relative">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-xl shadow-lg">
                {/* Number badge */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-fuchsia-500/50">
                  {idx + 1}
                </div>

                <div className="w-20 h-20 bg-slate-50 border-2 border-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6 mt-4">
                  <step.icon className="w-10 h-10 text-fuchsia-400" />
                </div>

                <h3 className="text-2xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
