'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Save, Loader2 } from 'lucide-react'
import { useSquadSave } from '@/hooks/useSquadSave'

interface SaveSquadButtonProps {
  currentGameweek: number
  gwOffset: number
}

export function SaveSquadButton({ currentGameweek, gwOffset }: SaveSquadButtonProps) {
  const [open, setOpen] = useState(false)
  const [squadName, setSquadName] = useState('')
  const [selectedGameweek, setSelectedGameweek] = useState(currentGameweek + gwOffset)
  const { saveSquad, saving } = useSquadSave()

  const handleSave = async () => {
    const success = await saveSquad(selectedGameweek, squadName || undefined)
    if (success) {
      setOpen(false)
      setSquadName('')
    }
  }

  const resetForm = () => {
    setSquadName('')
    setSelectedGameweek(currentGameweek + gwOffset)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm hover:shadow-md transition-all duration-200 gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm h-auto"
        >
          <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Squad</DialogTitle>
          <DialogDescription>
            Save your current squad for a specific gameweek. You can have different squads for different gameweeks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gameweek">Gameweek</Label>
            <Select 
              value={selectedGameweek.toString()} 
              onValueChange={(value) => setSelectedGameweek(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => (
                  <SelectItem key={gw} value={gw.toString()}>
                    Gameweek {gw}
                    {gw === currentGameweek + gwOffset && ' (Current)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="squadName">Squad Name (Optional)</Label>
            <Input
              id="squadName"
              placeholder={`GW${selectedGameweek} Squad`}
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !saving && handleSave()}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Squad
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
