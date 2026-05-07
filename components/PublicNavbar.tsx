'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

export function PublicNavbar() {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left — Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                <ArrowRight className="w-4 h-4 text-white rotate-[-45deg]" />
              </div>
              <span className="text-lg font-bold text-white hidden sm:block">FPL Companion</span>
            </Link>

            {/* Center — Links (desktop) */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                href={'/blog' as Route}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname?.startsWith('/blog') ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                Blog
              </Link>
              <Link
                href="/compare"
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === '/compare' ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                Compare
              </Link>
              <Link
                href="/fixtures"
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === '/fixtures' ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                Fixtures
              </Link>
            </div>

            {/* Right — Auth actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-lg font-semibold text-sm shadow-lg shadow-fuchsia-500/20 transition-all"
              >
                Get Started
              </Link>
              {/* Mobile hamburger */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[60] md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-700 z-[61] md:hidden flex flex-col animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-white rotate-[-45deg]" />
                </div>
                <span className="text-lg font-bold text-white">FPL Companion</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              <Link href={'/blog' as Route} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">
                Blog
              </Link>
              <Link href="/compare" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">
                Compare
              </Link>
              <Link href="/fixtures" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg">
                Fixtures
              </Link>
              <div className="my-3 border-t border-slate-700/50" />
              <Link href="/login" onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-4 py-3 text-base font-medium text-white bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-lg">
                Sign In / Get Started
              </Link>
            </nav>
          </div>
        </>
      )}
    </>
  )
}
