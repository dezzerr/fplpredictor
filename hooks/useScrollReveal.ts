'use client'

import { useEffect, useRef } from 'react'

/**
 * Adds the `is-visible` class to elements with the `scroll-reveal` class
 * within the returned ref when they enter the viewport. Supports a
 * `data-reveal-delay` attribute (in ms) for staggered timing.
 *
 * Usage:
 *   const ref = useScrollReveal<HTMLDivElement>()
 *   <div ref={ref}>
 *     <div className="scroll-reveal" data-reveal-delay="0">...</div>
 *     <div className="scroll-reveal" data-reveal-delay="120">...</div>
 *   </div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const items = root.querySelectorAll<HTMLElement>('.scroll-reveal')
    if (!items.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            const delay = parseInt(el.dataset.revealDelay || '0', 10)
            setTimeout(() => el.classList.add('is-visible'), delay)
            observer.unobserve(el)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    )

    items.forEach((item) => observer.observe(item))
    return () => observer.disconnect()
  }, [])

  return ref
}
