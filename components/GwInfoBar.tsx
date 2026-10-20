'use client'

import { useEffect, useState } from 'react'
import { formatDeadline, getMockDeadline } from '@/lib/date'
import { useLiveGwContext } from '@/components/LiveGwProvider'
import { LiveBadge } from '@/components/LiveBadge'
import { parseGameweek, resolveSelectedGameweek } from '@/lib/gameweek'

interface GwInfoBarProps {
  currentGw?: number | null
  gwOffset?: number
  centerOffset?: number
}

export function GwInfoBar({ currentGw: propGw, gwOffset = 0, centerOffset }: GwInfoBarProps) {
  const [mounted, setMounted] = useState(false)
  const [deadline, setDeadline] = useState<Date>(getMockDeadline())
  const [eventName, setEventName] = useState<string>('Gameweek')
  const [currentGw, setCurrentGw] = useState<number | null>(propGw ?? null)
  const { isLive } = useLiveGwContext()
  const selectedGameweek = resolveSelectedGameweek(currentGw, gwOffset)

  useEffect(() => {
    setMounted(true)
    fetch('/api/deadline')
      .then((res) => res.json())
      .then((data) => {
        setDeadline(new Date(data.deadline))
        if (typeof data.eventName === 'string') setEventName(data.eventName)
        const parsed = parseGameweek(data.eventId)
        if (parsed !== null) setCurrentGw(parsed)
      })
      .catch((err) => console.error('Failed to fetch deadline:', err))
  }, [])

  useEffect(() => {
    if (propGw !== undefined) setCurrentGw(propGw)
  }, [propGw])

  const deadlineText = mounted ? formatDeadline(deadline, '').replace(eventName, '').trim() : ''

  return (
    <div className="bg-slate-800 border-b border-slate-700/50" suppressHydrationWarning>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center py-1.5">
          <p
            className="flex items-center gap-2 text-xs font-medium text-slate-300"
            style={centerOffset !== undefined ? { transform: "translateX(" + centerOffset + "px)" } : undefined}
          >
            <span suppressHydrationWarning>
              {typeof selectedGameweek === 'number' ? `Gameweek ${selectedGameweek}` : 'Gameweek loading'}
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400" suppressHydrationWarning>
              Deadline: {deadlineText}
            </span>
            {isLive && <LiveBadge size="sm" />}
          </p>
        </div>
      </div>
    </div>
  )
}
