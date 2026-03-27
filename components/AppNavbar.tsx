'use client'

import { useState, useRef, useEffect } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown, Search, RefreshCw, LogOut, Menu, X, Users, TrendingUp, Download, GitCompare, CalendarDays, BookOpen, BrainCircuit } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSquadStore } from '@/store/squad'
import { createClient } from '@/lib/supabase/client'

/* ── Dropdown primitive ─────────────────────────────────── */

function NavDropdown({ label, children, active }: { label: string; children: React.ReactNode; active?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors',
          active ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
        )}
      >
        {label}
        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-52 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          <div onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

function DropdownItem({ href, icon: Icon, children, onClick }: { href?: Route; icon: React.ElementType; children: React.ReactNode; onClick?: () => void }) {
  const cls = 'flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors w-full text-left'

  if (href) {
    return (
      <Link href={href as Route} className={cls}>
        <Icon className="h-4 w-4 text-slate-400" />
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={cls}>
      <Icon className="h-4 w-4 text-slate-400" />
      {children}
    </button>
  )
}

/* ── Mobile drawer ──────────────────────────────────────── */

function MobileDrawer({ open, onClose, onImport, onLogout }: { open: boolean; onClose: () => void; onImport: () => void; onLogout: () => void }) {
  const pathname = usePathname()
  const aiTeamRoute = '/ai-team-rating' as Route

  if (!open) return null

  const linkCls = (href: string) =>
    cn(
      'flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors',
      pathname === href ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
    )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60] md:hidden" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-slate-900 border-r border-slate-700 z-[61] md:hidden flex flex-col animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-fuchsia-500 to-indigo-500 rounded-lg flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white rotate-[-45deg]" />
            </div>
            <span className="text-lg font-bold text-white">FPL Companion</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <p className="px-4 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">My Team</p>
          <Link href="/squad" onClick={onClose} className={linkCls('/squad')}>
            <Users className="h-5 w-5" /> Pick Team
          </Link>
          <Link href="/optimize" onClick={onClose} className={linkCls('/optimize')}>
            <TrendingUp className="h-5 w-5" /> Optimize
          </Link>
          <Link href={aiTeamRoute} onClick={onClose} className={linkCls(aiTeamRoute)}>
            <BrainCircuit className="h-5 w-5" /> AI Team Rating
          </Link>
          <button
            onClick={() => { onClose(); onImport(); }}
            className="flex items-center gap-3 px-4 py-3 text-base font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors w-full"
          >
            <Download className="h-5 w-5" /> Import Squad
          </button>

          <div className="my-3 border-t border-slate-700/50" />
          <p className="px-4 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tools</p>
          <Link href="/compare" onClick={onClose} className={linkCls('/compare')}>
            <GitCompare className="h-5 w-5" /> Compare
          </Link>
          <Link href="/fixtures" onClick={onClose} className={linkCls('/fixtures')}>
            <CalendarDays className="h-5 w-5" /> Fixtures
          </Link>

          <div className="my-3 border-t border-slate-700/50" />
          <Link href="/blog" onClick={onClose} className={linkCls('/blog')}>
            <BookOpen className="h-5 w-5" /> Blog
          </Link>
        </nav>

        <div className="border-t border-slate-700 p-3">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Main AppNavbar ─────────────────────────────────────── */

interface AppNavbarProps {
  onImportOpen?: () => void
  onSearchOpen?: () => void
}

export function AppNavbar({ onImportOpen, onSearchOpen }: AppNavbarProps) {
  const pathname = usePathname()
  const aiTeamRoute = '/ai-team-rating' as Route
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const syncPrices = useSquadStore((s) => s.syncPrices)
  const reset = useSquadStore((s) => s.reset)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/players')
      if (res.ok) {
        const players = await res.json()
        syncPrices(players)
      }
    } catch (err) {
      console.error('Failed to refresh:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        alert('Failed to log out: ' + error.message)
      } else {
        reset()
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const isTeamRoute = pathname === '/squad' || pathname === '/optimize'
  const isToolRoute = pathname === '/compare' || pathname === '/fixtures'
  const isAiRoute = pathname === aiTeamRoute

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

            {/* Center — Nav links (desktop) */}
            <div className="hidden md:flex items-center gap-1">
              <NavDropdown label="My Team" active={isTeamRoute}>
                <DropdownItem href="/squad" icon={Users}>Pick Team</DropdownItem>
                <DropdownItem href="/optimize" icon={TrendingUp}>Optimize</DropdownItem>
                {onImportOpen && (
                  <DropdownItem icon={Download} onClick={onImportOpen}>Import Squad</DropdownItem>
                )}
              </NavDropdown>

              <NavDropdown label="Tools" active={isToolRoute}>
                <DropdownItem href="/compare" icon={GitCompare}>Compare Players</DropdownItem>
                <DropdownItem href="/fixtures" icon={CalendarDays}>Fixture Analysis</DropdownItem>
              </NavDropdown>

              <Link
                href={aiTeamRoute}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isAiRoute ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                <BrainCircuit className="h-4 w-4" />
                AI Team Rating
              </Link>

              <Link
                href="/blog"
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname?.startsWith('/blog') ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
                )}
              >
                Blog
              </Link>
            </div>

            {/* Right — Actions */}
            <div className="flex items-center gap-1">
              {onSearchOpen && (
                <button
                  onClick={onSearchOpen}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                  title="Search players"
                >
                  <Search className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              </button>
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log Out
              </button>
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

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onImport={() => onImportOpen?.()}
        onLogout={handleLogout}
      />
    </>
  )
}
