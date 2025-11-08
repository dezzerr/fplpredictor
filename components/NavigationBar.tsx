'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, CalendarDays, Target, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SaveSquadButton } from '@/components/SaveSquadButton'
import { useSquadStore } from '@/store/squad'

interface NavigationBarProps {
  currentGameweek: number
  gwOffset: number
}

export function NavigationBar({ currentGameweek, gwOffset }: NavigationBarProps) {
  const [importOpen, setImportOpen] = useState(false)
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
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-lg p-3 shadow-sm">
      <nav className="flex items-center justify-center gap-2 flex-wrap">
        <Link 
          href="/compare" 
          className="inline-flex items-center rounded-md bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Target className="h-4 w-4 mr-2" />
          <span>Compare</span>
        </Link>
        <Link 
          href="/fixtures" 
          className="inline-flex items-center rounded-md bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-1.5 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          <span>Fixtures</span>
        </Link>
        <Link 
          href="/optimize" 
          className="inline-flex items-center rounded-md bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-1.5 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <Calendar className="h-4 w-4 mr-2" />
          <span>Optimize</span>
        </Link>
        <SaveSquadButton currentGameweek={currentGameweek} gwOffset={gwOffset} />
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm hover:shadow-md transition-all duration-200 gap-2"
            >
              <UploadCloud className="h-4 w-4" />
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
