'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { ArrowRight, Shield, Zap } from 'lucide-react'

/**
 * Bespoke hero illustration: isometric pitch plane with floating player-node
 * constellation, connection lines with flowing data, and a rising points curve.
 * All inline SVG — no external assets, GPU-friendly transforms only.
 */
function HeroIllustration() {
  const defNodes = [
    { x: 150, y: 190 }, { x: 200, y: 195 }, { x: 280, y: 195 }, { x: 330, y: 190 },
  ]
  const midNodes = [
    { x: 130, y: 250 }, { x: 200, y: 255 }, { x: 280, y: 255 }, { x: 350, y: 250 },
  ]
  const fwdNodes = [
    { x: 180, y: 310, cap: false }, { x: 240, y: 315, cap: true }, { x: 300, y: 310, cap: false },
  ]
  const sparkles = [
    { x: 80, y: 100, d: 0 }, { x: 400, y: 120, d: 1.5 }, { x: 60, y: 280, d: 0.8 },
    { x: 420, y: 250, d: 2.2 }, { x: 200, y: 80, d: 1.0 }, { x: 350, y: 340, d: 1.8 },
    { x: 110, y: 360, d: 0.5 }, { x: 380, y: 200, d: 2.5 },
  ]

  // Connection lines: GK→DEF, DEF→MID, MID→FWD
  const connections = [
    // GK to DEF
    { d: 'M 240 150 L 150 190', delay: 0 },
    { d: 'M 240 150 L 200 195', delay: 0.3 },
    { d: 'M 240 150 L 280 195', delay: 0.6 },
    { d: 'M 240 150 L 330 190', delay: 0.9 },
    // DEF to MID (selected)
    { d: 'M 150 190 L 130 250', delay: 0.2 },
    { d: 'M 200 195 L 200 255', delay: 0.5 },
    { d: 'M 280 195 L 280 255', delay: 0.8 },
    { d: 'M 330 190 L 350 250', delay: 1.1 },
    // MID to FWD (selected)
    { d: 'M 130 250 L 180 310', delay: 0.4 },
    { d: 'M 200 255 L 240 315', delay: 0.7 },
    { d: 'M 280 255 L 240 315', delay: 1.0 },
    { d: 'M 350 250 L 300 310', delay: 1.3 },
  ]

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg
        viewBox="0 0 480 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-2xl"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hero-pitch" x1="80" y1="60" x2="400" y2="380" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1a4d2e" />
            <stop offset="100%" stopColor="#0b3d25" />
          </linearGradient>
          <linearGradient id="hero-line" x1="60" y1="340" x2="420" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7C3AED" />
            <stop offset="55%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#22D3EE" />
          </linearGradient>
          <linearGradient id="hero-glow" x1="240" y1="0" x2="240" y2="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.05" />
          </linearGradient>
          <filter id="hero-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
        </defs>

        {/* Ambient glow */}
        <rect x="0" y="0" width="480" height="420" fill="url(#hero-glow)" />

        {/* Sparkle particles */}
        {sparkles.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r="1.5"
            fill="#A855F7"
            className="animate-sparkle"
            style={{ animationDelay: `${s.d}s` }}
          />
        ))}

        {/* Isometric pitch plane */}
        <g transform="translate(240, 210) skewX(-20) scale(1, 0.72)">
          <rect x="-180" y="-140" width="360" height="280" rx="8" fill="url(#hero-pitch)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <ellipse cx="0" cy="0" rx="40" ry="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <line x1="0" y1="-140" x2="0" y2="140" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <rect x="-60" y="-140" width="120" height="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <rect x="-60" y="90" width="120" height="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        </g>

        {/* Connection lines between formation layers */}
        {connections.map((c, i) => (
          <path
            key={i}
            d={c.d}
            stroke="url(#hero-line)"
            strokeWidth="1"
            strokeLinecap="round"
            fill="none"
            strokeDasharray="3 5"
            opacity="0.25"
            className="animate-dash-flow"
            style={{ animationDelay: `${c.delay}s` }}
          />
        ))}

        {/* Player nodes — GK */}
        <g className="animate-float-organic" style={{ animationDelay: '0s' }}>
          <circle cx="240" cy="150" r="20" fill="#A855F7" opacity="0.15" filter="url(#hero-blur)" />
          <circle cx="240" cy="150" r="14" fill="#1A1E33" stroke="#A855F7" strokeWidth="2" />
          <text x="240" y="155" textAnchor="middle" fill="#A855F7" fontSize="9" fontWeight="bold">GK</text>
        </g>

        {/* Player nodes — DEF */}
        {defNodes.map((p, i) => (
          <g key={i} className="animate-float-organic-2" style={{ animationDelay: `${i * 0.5}s` }}>
            <circle cx={p.x} cy={p.y} r="18" fill="#7C3AED" opacity="0.1" filter="url(#hero-blur)" />
            <circle cx={p.x} cy={p.y} r="12" fill="#1A1E33" stroke="#7C3AED" strokeWidth="2" />
          </g>
        ))}

        {/* Player nodes — MID */}
        {midNodes.map((p, i) => (
          <g key={i} className="animate-float-organic" style={{ animationDelay: `${i * 0.6 + 1}s` }}>
            <circle cx={p.x} cy={p.y} r="18" fill="#A855F7" opacity="0.1" filter="url(#hero-blur)" />
            <circle cx={p.x} cy={p.y} r="12" fill="#1A1E33" stroke="#A855F7" strokeWidth="2" />
          </g>
        ))}

        {/* Player nodes — FWD (captain highlighted) */}
        {fwdNodes.map((p, i) => (
          <g key={i} className="animate-float-organic-2" style={{ animationDelay: `${i * 0.7 + 0.5}s` }}>
            {p.cap ? (
              <>
                <circle cx={p.x} cy={p.y} r="28" fill="#22D3EE" opacity="0.12" filter="url(#hero-blur)" className="animate-node-breathe" />
                <circle cx={p.x} cy={p.y} r="22" fill="none" stroke="#22D3EE" strokeWidth="1" opacity="0.3" className="animate-glow-pulse" style={{ color: '#22D3EE' }} />
                <circle cx={p.x} cy={p.y} r="16" fill="#22D3EE" stroke="#22D3EE" strokeWidth="2" />
                <text x={p.x} y={p.y + 4} textAnchor="middle" fill="#0B0D17" fontSize="8" fontWeight="bold">C</text>
              </>
            ) : (
              <>
                <circle cx={p.x} cy={p.y} r="18" fill="#7C3AED" opacity="0.1" filter="url(#hero-blur)" />
                <circle cx={p.x} cy={p.y} r="13" fill="#1A1E33" stroke="#7C3AED" strokeWidth="2" />
              </>
            )}
          </g>
        ))}

        {/* Prediction line — from captain node rising to points curve */}
        <path
          d="M 240 315 Q 280 250 320 180 L 380 90"
          stroke="url(#hero-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="4 6"
          opacity="0.6"
          className="animate-dash-flow"
        />

        {/* Rising points curve */}
        <path
          d="M 60 360 L 120 330 L 180 290 L 240 240 L 300 170 L 360 110 L 410 70"
          stroke="url(#hero-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="animate-draw-line"
          style={{ ['--draw-length' as string]: '700' } as React.CSSProperties}
        />

        {/* Points curve area fill */}
        <path
          d="M 60 360 L 120 330 L 180 290 L 240 240 L 300 170 L 360 110 L 410 70 L 410 360 L 60 360 Z"
          fill="url(#hero-line)"
          opacity="0.06"
        />

        {/* Apex arrowhead */}
        <path d="M 398 78 L 410 70 L 406 84" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* Data point markers on curve */}
        {[
          { x: 120, y: 330 }, { x: 180, y: 290 }, { x: 240, y: 240 }, { x: 300, y: 170 }, { x: 360, y: 110 },
        ].map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="#22D3EE" opacity="0.2" />
            <circle cx={p.x} cy={p.y} r="3" fill="#22D3EE" opacity="0.8" />
          </g>
        ))}

        {/* Floating stat chips */}
        <g className="animate-float-organic" style={{ animationDelay: '0.5s' }}>
          <rect x="350" y="30" width="100" height="36" rx="8" fill="#121524" stroke="#A855F7" strokeWidth="1" opacity="0.9" />
          <text x="360" y="46" fill="#A855F7" fontSize="8" fontWeight="600">PREDICTED PTS</text>
          <text x="360" y="60" fill="#22D3EE" fontSize="14" fontWeight="bold">84.1</text>
        </g>

        <g className="animate-float-organic-2" style={{ animationDelay: '1s' }}>
          <rect x="20" y="50" width="90" height="32" rx="8" fill="#121524" stroke="#22D3EE" strokeWidth="1" opacity="0.9" />
          <text x="30" y="64" fill="#22D3EE" fontSize="8" fontWeight="600">TEAM RATING</text>
          <text x="30" y="76" fill="#fff" fontSize="12" fontWeight="bold">92%</text>
        </g>
      </svg>
    </div>
  )
}

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden pt-6 pb-20 lg:pb-24">
      {/* Background — deep indigo-black with animated brand glows */}
      <div className="absolute inset-0 bg-surface-0" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-[128px] pointer-events-none animate-aurora" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[128px] pointer-events-none animate-aurora-2" />

      {/* Subtle pitch-line pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          maskImage: 'linear-gradient(to bottom, white, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, white, transparent)',
        }}
      />

      <div className="relative mb-16" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left animate-fade-up">
            {/* Announcement badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium mb-8 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
              Now with Live GW Updates
            </div>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
              Win Your League with{' '}
              <span className="text-shimmer">AI Predictions</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Stop guessing. Start optimizing. Get advanced points predictions, automated squad planning, and real-time transfer insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link
                href="/login"
                className="px-8 py-4 bg-gradient-brand-cta hover:brightness-110 text-white rounded-xl font-bold text-lg shadow-glow-brand transition-all duration-200 flex items-center justify-center gap-2 group"
              >
                Start Winning
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href={'/blog' as Route}
                className="px-8 py-4 bg-surface-1/80 hover:bg-surface-2 text-white rounded-xl font-semibold text-lg border border-surface-border backdrop-blur-sm transition-colors duration-200"
              >
                Read the Blog
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center justify-center lg:justify-start gap-8 text-slate-500">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-violet-400" />
                <span className="text-sm">Secure &amp; Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                <span className="text-sm">Real-time Data</span>
              </div>
            </div>
          </div>

          {/* Bespoke SVG Illustration */}
          <div className="relative flex items-center justify-center">
            <HeroIllustration />
          </div>
        </div>
      </div>
    </section>
  )
}
