'use client'

import { Download, Radar, Trophy } from 'lucide-react'
import { useScrollReveal } from '@/hooks/useScrollReveal'

const steps = [
  {
    icon: Download,
    title: 'Import Your Squad',
    description: 'Enter your FPL team ID and we pull your entire squad, budget, and ownership in seconds.',
  },
  {
    icon: Radar,
    title: 'Analyse & Predict',
    description: 'Our engine runs fixture difficulty, form, market odds, and AI news signals to project points for every player.',
  },
  {
    icon: Trophy,
    title: 'Optimise & Win',
    description: 'Auto-select your best XI, compare transfer targets, and apply changes — all backed by data, not gut feeling.',
  },
]

export default function HomeHowItWorks() {
  const ref = useScrollReveal<HTMLElement>()
  return (
    <section ref={ref} className="relative py-24 sm:py-32 cv-auto bg-surface-0 border-t border-surface-border">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16 scroll-reveal">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            From squad to <span className="text-shimmer">champion</span> in three steps
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            No spreadsheets. No guesswork. Just a clear path from where you are to where you want to be.
          </p>
        </div>

        {/* Connected journey */}
        <div className="relative">
          {/* Connecting path — desktop only */}
          <svg
            className="hidden lg:block absolute top-12 left-[16%] right-[16%] w-[68%] h-4 pointer-events-none"
            viewBox="0 0 800 16"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="journey-line" x1="0" y1="8" x2="800" y2="8" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#22D3EE" />
              </linearGradient>
            </defs>
            <line x1="0" y1="8" x2="800" y2="8" stroke="url(#journey-line)" strokeWidth="2" strokeDasharray="6 6" className="animate-draw-line" style={{ ['--draw-length' as string]: '800' } as React.CSSProperties} />
          </svg>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className="relative flex flex-col items-center text-center scroll-reveal"
                data-reveal-delay={idx * 150}
              >
                {/* Step node */}
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-2xl bg-surface-1 border border-surface-border flex items-center justify-center shadow-glow-brand transition-all duration-300 hover:scale-105 hover:border-violet-500/40 hover:shadow-glow-brand">
                    <step.icon className="w-10 h-10 text-violet-400" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-brand-cta text-white text-sm font-bold flex items-center justify-center shadow-lg">
                    {idx + 1}
                  </div>
                </div>

                <h3 className="font-display text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed max-w-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
