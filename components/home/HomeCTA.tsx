'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { useScrollReveal } from '@/hooks/useScrollReveal'

/**
 * Stadium-at-night SVG scene — floodlight beams, gradient sky, pitch silhouette.
 * Replaces the generic flat gradient box. All inline SVG, no external assets.
 */
function StadiumScene() {
  return (
    <svg
      viewBox="0 0 1200 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cta-sky" x1="0" y1="0" x2="0" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B0D17" />
          <stop offset="60%" stopColor="#121524" />
          <stop offset="100%" stopColor="#1a4d2e" />
        </linearGradient>
        <linearGradient id="cta-beam" x1="600" y1="0" x2="600" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cta-beam2" x1="300" y1="0" x2="300" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cta-beam3" x1="900" y1="0" x2="900" y2="300" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1200" height="400" fill="url(#cta-sky)" />

      {/* Floodlight beams */}
      <polygon points="550,0 650,0 700,300 500,300" fill="url(#cta-beam)" className="animate-glow-pulse" style={{ color: '#A855F7' }} />
      <polygon points="250,0 350,0 380,300 220,300" fill="url(#cta-beam2)" className="animate-glow-pulse" style={{ animationDelay: '1s', color: '#22D3EE' }} />
      <polygon points="850,0 950,0 980,300 820,300" fill="url(#cta-beam3)" className="animate-glow-pulse" style={{ animationDelay: '2s', color: '#22D3EE' }} />

      {/* Stadium silhouette — stands */}
      <path d="M0 300 L100 280 L200 285 L300 275 L400 280 L500 270 L600 275 L700 270 L800 275 L900 280 L1000 275 L1100 285 L1200 280 L1200 400 L0 400 Z" fill="#0B0D17" opacity="0.6" />

      {/* Pitch */}
      <path d="M0 320 L1200 320 L1200 400 L0 400 Z" fill="#0b3d25" />
      <line x1="600" y1="320" x2="600" y2="400" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
      <ellipse cx="600" cy="360" rx="80" ry="30" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Stars */}
      {[
        { x: 100, y: 30 }, { x: 300, y: 50 }, { x: 500, y: 20 }, { x: 700, y: 40 }, { x: 900, y: 25 }, { x: 1100, y: 50 },
        { x: 200, y: 80 }, { x: 450, y: 90 }, { x: 800, y: 70 }, { x: 1050, y: 85 },
      ].map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r="1" fill="white" opacity="0.4" className="animate-sparkle" style={{ animationDelay: `${i * 0.5}s` }} />
      ))}
    </svg>
  )
}

export default function HomeCTA() {
  const ref = useScrollReveal<HTMLElement>()
  return (
    <section ref={ref} className="relative py-20 sm:py-24 cv-auto bg-surface-0 border-t border-surface-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main CTA */}
        <div className="relative overflow-hidden rounded-[2.5rem] border border-surface-border p-12 sm:p-20 mb-24 text-center scroll-reveal">
          {/* Stadium-night background */}
          <StadiumScene />

          {/* Content */}
          <div className="relative z-10">
            <h2 className="font-display text-4xl sm:text-5xl font-bold text-white mb-6 tracking-tight">
              Your mini-league title{' '}
              <span className="text-shimmer">starts here</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
              Join thousands of managers using data-driven predictions to dominate their leagues. Free forever.
            </p>
            <Link
              href="/login"
              className="group inline-flex px-8 py-4 bg-gradient-brand-cta hover:brightness-110 text-white rounded-xl font-bold text-lg shadow-glow-brand transition-all duration-200 items-center gap-2"
            >
              Start Winning
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <p className="text-slate-500 text-sm mt-8">
              No credit card required &bull; Free forever &bull; Setup in 60 seconds
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pb-8 border-t border-surface-border pt-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Logo idSuffix="footer" />
          </div>
          <p className="text-slate-500 text-sm mb-6">
            &copy; 2026 FPL Companion. All rights reserved. Not affiliated with the Premier League.
          </p>
          <div className="flex justify-center gap-8 text-sm text-slate-500">
            <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link href={'/blog' as Route} className="hover:text-white transition-colors">Blog</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </footer>
      </div>
    </section>
  )
}
