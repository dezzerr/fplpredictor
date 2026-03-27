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

export default function HomeWhyChoose() {
  return (
    <section className="relative py-24 sm:py-32 cv-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Why Choose FPL Companion Over{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-indigo-600">
              Official FPL?
            </span>
          </h2>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Built by FPL managers, for FPL managers
          </p>
        </div>

        <div className="space-y-6">
          {advantages.map((advantage, idx) => (
            <div
              key={idx}
              className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:border-fuchsia-300 transition-all duration-300 hover:shadow-xl hover:shadow-fuchsia-500/5 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300 border border-slate-200 group-hover:border-fuchsia-300">
                  <advantage.icon className="w-8 h-8 text-fuchsia-600" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{advantage.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{advantage.description}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl px-6 py-3 shrink-0 group-hover:border-fuchsia-300 transition-colors">
                  <div className="text-fuchsia-600 font-semibold text-sm">{advantage.highlight}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link href="/login" className="group inline-flex px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-fuchsia-500/25 transition-all duration-200 items-center gap-2">
            Try FPL Companion Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  )
}
