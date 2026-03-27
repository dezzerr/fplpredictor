'use client'

import { useEffect, useState } from 'react'
import { formatDeadline, getMockDeadline } from '@/lib/date'
import { useLiveGwContext } from '@/components/LiveGwProvider'
import { LiveBadge } from '@/components/LiveBadge'

interface GwInfoBarProps {
  currentGw?: number
  gwOffset?: number
}

export function GwInfoBar({ currentGw: propGw, gwOffset = 0 }: GwInfoBarProps) {
  const [mounted, setMounted] = useState(false)
  const [deadline, setDeadline] = useState<Date>(getMockDeadline())
  const [eventName, setEventName] = useState<string>('Gameweek')
  const [currentGw, setCurrentGw] = useState<number>(propGw ?? 8)
  const { isLive } = useLiveGwContext()

  useEffect(() => {
    setMounted(true)
    fetch('/api/deadline')
      .then((res) => res.json())
      .then((data) => {
        setDeadline(new Date(data.deadline))
        if (typeof data.eventName === 'string') setEventName(data.eventName)
        if (typeof data.eventId === 'number') {
          setCurrentGw(data.eventId)
        } else {
          const parsed = parseInt(String(data.eventId), 10)
          if (!Number.isNaN(parsed)) setCurrentGw(parsed)
          else if (typeof data.eventName === 'string') {
            const match = data.eventName.match(/\d+/)
            if (match) setCurrentGw(parseInt(match[0], 10))
          }
        }
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
          <p className="text-xs font-medium text-slate-300 flex items-center gap-2">
            <span suppressHydrationWarning>
              Gameweek {currentGw + gwOffset}
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
