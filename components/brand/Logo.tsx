'use client'

import { cn } from '@/lib/utils'

/**
 * FPL Companion — "Ascent Crest" logo.
 *
 * Concept:
 * - Shield silhouette      → football heritage & competition
 * - Rising sparkline       → points trajectory / green arrows / rank climb
 * - Arrowhead at the apex  → "win your mini-league"
 * The line breaks read as a stylised "F" in negative space.
 */

interface LogoMarkProps {
  className?: string
  /** Animate the sparkline drawing in (use sparingly, e.g. loading screens) */
  animated?: boolean
  /** Unique id suffix when multiple logos render on one page */
  idSuffix?: string
}

export function LogoMark({ className, animated = false, idSuffix = 'default' }: LogoMarkProps) {
  const gradId = `ascent-grad-${idSuffix}`
  const glowId = `ascent-glow-${idSuffix}`
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="55%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={glowId} x1="8" y1="44" x2="40" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Shield */}
      <path
        d="M24 3.5 L41 9.5 V23 C41 33.5 34 40.5 24 44.5 C14 40.5 7 33.5 7 23 V9.5 Z"
        fill="hsl(231 35% 10%)"
        stroke={`url(#${glowId})`}
        strokeWidth="1.5"
      />

      {/* Rising sparkline that kinks upward into an arrowhead */}
      <path
        d="M12.5 31.5 L19 25.5 L23.5 29 L33 17.5"
        stroke={`url(#${gradId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animated ? 'animate-draw-line' : undefined}
        style={animated ? ({ ['--draw-length' as string]: '48' } as React.CSSProperties) : undefined}
      />
      {/* Arrowhead apex */}
      <path
        d="M27.5 16.5 L33.5 15 L32.5 21"
        stroke={`url(#${gradId})`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Baseline node — where every manager starts */}
      <circle cx="12.5" cy="31.5" r="2.2" fill="#22D3EE" />
    </svg>
  )
}

interface LogoProps {
  className?: string
  markClassName?: string
  /** Show the "FPL Companion" wordmark next to the crest */
  withWordmark?: boolean
  /** Hide wordmark below the sm breakpoint */
  wordmarkResponsive?: boolean
  wordmarkClassName?: string
  animated?: boolean
  idSuffix?: string
}

export function Logo({
  className,
  markClassName,
  withWordmark = true,
  wordmarkResponsive = false,
  wordmarkClassName,
  animated = false,
  idSuffix = 'default',
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={markClassName} animated={animated} idSuffix={idSuffix} />
      {withWordmark && (
        <span
          className={cn(
            'font-display text-lg font-bold tracking-tight text-white',
            wordmarkResponsive && 'hidden sm:block',
            wordmarkClassName
          )}
        >
          FPL Companion
        </span>
      )}
    </span>
  )
}
