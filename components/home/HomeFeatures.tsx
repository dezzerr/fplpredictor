'use client'

import Link from 'next/link'
import { BarChart3, Zap, Calendar, RefreshCw, GitCompare, ArrowRight } from 'lucide-react'

const tools = [
  {
    icon: BarChart3,
    title: 'AI-Powered Predictions',
    description:
      'Three prediction modes—conservative, baseline, and aggressive—built on form, fixtures, and real market odds so every points estimate is grounded in data.',
  },
  {
    icon: Zap,
    title: 'One-Tap Best XI',
    description:
      'Hit a single button and the optimiser selects your highest-scoring starting eleven and bench order for any upcoming gameweek.',
  },
  {
    icon: GitCompare,
    title: 'Player Comparison',
    description:
      'Place any two players side-by-side with projected points, form graphs, fixture difficulty, and ownership trends in one clean view.',
  },
  {
    icon: Calendar,
    title: 'Fixture Planner',
    description:
      'Visualise fixture difficulty across ten gameweeks at a glance—spot double gameweeks, blank weeks, and rotation-proof assets instantly.',
  },
  {
    icon: RefreshCw,
    title: 'Live Team Sync',
    description:
      'Import your FPL squad in one click and keep prices, injuries, and ownership in sync with the official game throughout the week.',
  },
]

function PlayerTile({ name, fixture, pts, jersey, fixtureBg, isCaptain }: {
  name: string; fixture: string; pts: string; jersey: string; fixtureBg?: string; isCaptain?: boolean
}) {
  return (
    <div className="flex flex-col items-center w-[70px]">
      {/* Jersey */}
      <div className="relative">
        {isCaptain && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white text-[8px] font-bold text-slate-900 flex items-center justify-center z-10 shadow">C</div>
        )}
        <div className={`w-10 h-10 ${jersey} rounded-md shadow-md flex items-center justify-center`}>
          <svg className="w-6 h-6 text-white/80" viewBox="0 0 24 24" fill="currentColor"><path d="M16 2l4 4-1.5 1.5L17 6v5h-3V6h-4v5H7V6L5.5 7.5 4 6l4-4h8zM7 13h10v7a2 2 0 01-2 2H9a2 2 0 01-2-2v-7z"/></svg>
        </div>
      </div>
      {/* Name */}
      <div className="mt-1 bg-slate-800/90 rounded-t text-[9px] font-medium text-white text-center w-full py-0.5 truncate px-1">{name}</div>
      {/* Fixture */}
      <div className={`${fixtureBg || 'bg-slate-700'} text-[8px] text-white text-center w-full py-0.5 truncate px-1`}>{fixture}</div>
      {/* Points */}
      <div className="bg-slate-800/90 rounded-b text-[10px] font-bold text-emerald-400 text-center w-full py-0.5">{pts}</div>
    </div>
  )
}

export default function HomeFeatures() {
  return (
    <section id="features" className="relative py-24 sm:py-32 cv-auto bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left — app preview */}
          <div className="relative">
            <div className="sticky top-32 rounded-2xl overflow-hidden border border-slate-200 shadow-xl bg-slate-900 max-w-[380px] mx-auto lg:mx-0">
              {/* KPI bar */}
              <div className="grid grid-cols-4 text-center py-2.5 px-3 bg-slate-800/90 border-b border-slate-700/50 text-[10px]">
                <div><div className="text-slate-500 uppercase tracking-wider mb-0.5">Team</div><div className="text-emerald-400 font-bold text-sm">100%</div></div>
                <div><div className="text-slate-500 uppercase tracking-wider mb-0.5">GW</div><div className="text-emerald-400 font-bold text-sm">100%</div></div>
                <div><div className="text-slate-500 uppercase tracking-wider mb-0.5">Pts</div><div className="text-white font-bold text-sm">84.1</div></div>
                <div><div className="text-slate-500 uppercase tracking-wider mb-0.5">Bank</div><div className="text-white font-bold text-sm">£3.7m</div></div>
              </div>

              {/* Pitch */}
              <div className="relative bg-gradient-to-b from-emerald-700 via-emerald-600 to-emerald-700 px-3 pt-5 pb-4">
                {/* Pitch lines */}
                <div className="absolute inset-x-4 top-0 bottom-0 border border-white/10 rounded-lg" />
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10" />

                {/* GK */}
                <div className="flex justify-center mb-4">
                  <PlayerTile name="Dúbravka" fixture="BHA (H)" pts="1.9" jersey="bg-slate-500" />
                </div>
                {/* DEF — 3 */}
                <div className="flex justify-around mb-4">
                  <PlayerTile name="Hill" fixture="ARS (A)" pts="3.7" jersey="bg-red-600" fixtureBg="bg-red-500" />
                  <PlayerTile name="Hall" fixture="CRY (A)" pts="6.4" jersey="bg-slate-800" />
                  <PlayerTile name="Kerkez" fixture="FUL (H)" pts="7.0" jersey="bg-red-600" fixtureBg="bg-emerald-600" />
                </div>
                {/* MID — 4 */}
                <div className="flex justify-around mb-4">
                  <PlayerTile name="Gordon" fixture="CRY (A)" pts="9.3" jersey="bg-slate-800" />
                  <PlayerTile name="B.Ferna..." fixture="LEE (H)" pts="4.6" jersey="bg-red-600" fixtureBg="bg-emerald-600" />
                  <PlayerTile name="Schade" fixture="EVE (H)" pts="10.2" jersey="bg-red-600" />
                  <PlayerTile name="Rayan" fixture="ARS (A)" pts="3.4" jersey="bg-red-600" fixtureBg="bg-red-500" />
                </div>
                {/* FWD — 3 */}
                <div className="flex justify-around mb-2">
                  <PlayerTile name="Bowen" fixture="WOL (H)" pts="4.9" jersey="bg-rose-800" />
                  <PlayerTile name="Ekitiké" fixture="FUL (H)" pts="10.7" jersey="bg-rose-800" isCaptain />
                  <PlayerTile name="Thiago" fixture="EVE (H)" pts="11.3" jersey="bg-red-600" />
                </div>
              </div>

              {/* Bench hint */}
              <div className="bg-slate-800 px-3 py-2 flex items-center justify-center gap-3 text-[9px] text-slate-500">
                <span>BENCH</span>
                <div className="flex gap-2">
                  {['Pickford', 'Saliba', 'Estupiñán', 'Mbeumo'].map(n => (
                    <span key={n} className="bg-slate-700/60 rounded px-1.5 py-0.5 text-slate-400">{n}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — feature list */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3 tracking-tight leading-tight">
              Your entire FPL toolkit,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 to-indigo-600">
                one dashboard
              </span>
            </h2>
            <p className="text-lg text-slate-500 mb-10 max-w-lg">
              Stop switching between tabs. Everything from predictions to fixture planning lives in a single, fast interface.
            </p>

            <div className="space-y-8">
              {tools.map((tool, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="mt-1 w-10 h-10 shrink-0 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                    <tool.icon className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{tool.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-[15px]">{tool.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <Link
                href="/login"
                className="group inline-flex px-7 py-3.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-fuchsia-500/20 transition-all duration-200 items-center gap-2"
              >
                Get started free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
