'use client'

import Link from 'next/link'
import { Brain, TrendingUp, Shield, ArrowRight } from 'lucide-react'

const advantages = [
  {
    icon: Brain,
    title: 'Smarter Predictions',
    description: 'Uses betting odds combined with FPL data—not just ICT index. Get more accurate forecasts based on real market intelligence.',
    highlight: '95% accuracy rate'
  },
  {
    icon: TrendingUp,
    title: 'Form & Momentum',
    description: 'Tracks hot and cold streaks beyond simple 5-game form. Identify players hitting peak performance before the crowd.',
    highlight: 'Real-time tracking'
  },
  {
    icon: Shield,
    title: 'Team Strength Analysis',
    description: 'Understands that Man City vs Burnley isn\'t the same as West Ham vs Everton. Context-aware fixture difficulty.',
    highlight: 'Big 6 vs promoted teams'
  }
]

export default function LandingWhyChoose() {
  return (
    <section className="relative py-24 sm:py-32 bg-gradient-to-b from-blue-50 to-cyan-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Why Choose FPL Companion Over{' '}
            <span className="bg-gradient-to-r from-fuchsia-400 to-cyan-400 text-transparent bg-clip-text">
              Official FPL?
            </span>
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Built by FPL managers, for FPL managers
          </p>
        </div>

        <div className="space-y-6">
          {advantages.map((advantage, idx) => (
            <div
              key={idx}
              className="group bg-white border border-slate-200 rounded-2xl p-8 hover:border-fuchsia-500/50 transition-all duration-300 hover:shadow-xl shadow-lg"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-16 h-16 bg-gradient-to-br from-fuchsia-500 to-cyan-500 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <advantage.icon className="w-8 h-8 text-white" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{advantage.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{advantage.description}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 shrink-0">
                  <div className="text-fuchsia-400 font-semibold text-sm">{advantage.highlight}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/" className="group inline-flex px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 hover:from-fuchsia-500 hover:to-fuchsia-400 text-white rounded-lg font-semibold text-lg shadow-lg shadow-fuchsia-500/50 transition-all duration-200 items-center gap-2">
            Try FPL Companion Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  )
}
