'use client'

import type { Route } from 'next'
import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, Calendar, CalendarDays, Target, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SaveSquadButton } from '@/components/SaveSquadButton'
import { FPLManagerLookup } from '@/components/FPLManagerLookup'
import { useSquadStore } from '@/store/squad'

interface NavigationBarProps {
  currentGameweek: number
  gwOffset: number
}

export function NavigationBar({ currentGameweek, gwOffset }: NavigationBarProps) {
  const [importOpen, setImportOpen] = useState(false)
  const [inputMode, setInputMode] = useState<'id' | 'manager'>('id')
  const [entryId, setEntryId] = useState("")
  const [preset, setPreset] = useState("baseline")
  const [pending, setPending] = useState(false)
  const initialize = useSquadStore((s) => s.initialize)

  const onImport = async () => {
    if (!entryId.trim() || pending) return
    setPending(true)
    const res = await initialize({ entryId: entryId.trim(), preset })
    setPending(false)
    if (res.ok) {
      setImportOpen(false)
      setEntryId("")
    } else {
      alert(res.error)
    }
  }

  return (
    <div className="bg-gradient-to-r from-surface-1 to-surface-1 border border-surface-border rounded-lg p-2 sm:p-3 shadow-sm">
      <nav className="flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
        <Link 
          href="/compare" 
          className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span>Compare</span>
        </Link>
        <Link 
          href="/fixtures" 
          className="inline-flex items-center rounded-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <CalendarDays className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span>Fixtures</span>
        </Link>
        <Link 
          href="/optimize" 
          className="inline-flex items-center rounded-md bg-gradient-brand-cta hover:opacity-90 text-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span>Optimize</span>
        </Link>
        <Link 
          href={'/blog' as Route} 
          className="inline-flex items-center rounded-md bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span>Blog</span>
        </Link>
        <SaveSquadButton currentGameweek={currentGameweek} gwOffset={gwOffset} />
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all duration-200 gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm h-auto"
            >
              <UploadCloud className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Import</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Import FPL Squad</DialogTitle>
              <DialogDescription>
                Enter your FPL team ID to load your current squad with latest prices and projections.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('id')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    inputMode === 'id'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Enter Team ID
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('manager')}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    inputMode === 'manager'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Find FPL Team
                </button>
              </div>

              {inputMode === 'manager' && (
                <FPLManagerLookup
                  onSelect={(selectedEntryId) => {
                    setEntryId(selectedEntryId)
                  }}
                />
              )}

              <div className="space-y-2">
                <Input 
                  placeholder="FPL Team ID (e.g. 1234567)" 
                  value={entryId} 
                  onChange={(e) => setEntryId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onImport()}
                  inputMode="numeric"
                  disabled={pending}
                />
                <Select value={preset} onValueChange={setPreset} disabled={pending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="baseline">Baseline</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={onImport} disabled={pending} className="w-full">
                {pending ? "Importing..." : "Import Squad"}
              </Button>
              <div className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Find your team ID in the URL on the FPL website when viewing your team points (e.g. fantasy.premierleague.com/entry/<strong>1234567</strong>/event/).
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </nav>
    </div>
  )
}
