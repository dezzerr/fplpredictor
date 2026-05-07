import 'server-only'

import type { Player, Squad } from '@/lib/data'
import type { StoredFplSession } from '@/lib/fpl-session'

const FPL_BASE_URL = 'https://fantasy.premierleague.com'

type FplPick = {
  element: number
  position: number
  multiplier: number
  is_captain: boolean
  is_vice_captain: boolean
}

type MyTeamResponse = {
  picks?: FplPick[]
  transfers?: {
    bank?: number
    limit?: number | null
    made?: number
    cost?: number
  }
  chips?: Array<{ name?: string; status_for_entry?: string }>
}

type FplEvent = {
  id?: number
  is_next?: boolean
  finished?: boolean
  deadline_time?: string
}

export type FplPickDiffItem = {
  type: 'captain' | 'vice' | 'lineup' | 'bench' | 'unsupported_transfer' | 'chip_blocked'
  label: string
  before?: string
  after?: string
}

export type FplPickPreview = {
  canApply: boolean
  changes: FplPickDiffItem[]
  unsupported: FplPickDiffItem[]
  desiredPicks: FplPick[]
  livePicks: FplPick[]
}

function csrfFromCookies(cookies: string) {
  const match = cookies.match(/(?:^|;\s*)csrftoken=([^;]+)/)
  return match?.[1]
}

function fplHeaders(session: StoredFplSession, json = false) {
  const headers: Record<string, string> = {
    Cookie: session.cookies,
    Origin: FPL_BASE_URL,
    Referer: `${FPL_BASE_URL}/my-team`,
    'User-Agent': 'Mozilla/5.0 FPL Companion',
  }

  const csrf = csrfFromCookies(session.cookies)
  if (csrf) headers['X-CSRFToken'] = csrf
  if (json) headers['Content-Type'] = 'application/json'

  return headers
}

function playerLabel(player?: Player) {
  if (!player) return 'Unknown player'
  return `${player.name} (${player.team})`
}

function allLocalPlayers(squad: Squad) {
  return [
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
    ...squad.bench,
  ].filter(Boolean)
}

function normalizeId(id: string | number) {
  const parsed = Number(id)
  return Number.isFinite(parsed) ? parsed : null
}

function parseFplError(data: unknown) {
  if (typeof data === 'string' && data.trim()) return data
  if (!data || typeof data !== 'object') return 'FPL rejected the team update.'

  const value = data as Record<string, unknown>
  for (const key of ['detail', 'error', 'message']) {
    if (typeof value[key] === 'string' && value[key]) return String(value[key])
  }

  const nonFieldErrors = value.non_field_errors
  if (Array.isArray(nonFieldErrors) && nonFieldErrors.length) {
    return nonFieldErrors.map(String).join(' ')
  }

  return 'FPL rejected the team update.'
}

export function buildDesiredPicksFromSquad(squad: Squad): FplPick[] {
  const starters = [
    ...squad.starters.GK,
    ...squad.starters.DEF,
    ...squad.starters.MID,
    ...squad.starters.FWD,
  ]

  const ordered = [...starters, ...squad.bench]
  if (ordered.length !== 15) {
    throw Object.assign(new Error('Your local squad must have 15 players before applying to FPL.'), { status: 400 })
  }

  const starterIds = new Set(starters.map((player) => player.id))
  if (!squad.captainId || !starterIds.has(squad.captainId)) {
    throw Object.assign(new Error('Choose a starting captain before applying to FPL.'), { status: 400 })
  }

  if (!squad.viceId || !starterIds.has(squad.viceId) || squad.viceId === squad.captainId) {
    throw Object.assign(new Error('Choose a different starting vice-captain before applying to FPL.'), { status: 400 })
  }

  return ordered.map((player, index) => {
    const element = normalizeId(player.id)
    if (!element) {
      throw Object.assign(new Error(`Cannot apply ${player.name}; it is missing a valid FPL player ID.`), { status: 400 })
    }

    return {
      element,
      position: index + 1,
      is_captain: player.id === squad.captainId,
      is_vice_captain: player.id === squad.viceId,
      multiplier: player.id === squad.captainId ? 2 : index < 11 ? 1 : 0,
    }
  })
}

export async function fetchAuthenticatedMyTeam(session: StoredFplSession): Promise<MyTeamResponse> {
  const res = await fetch(`${FPL_BASE_URL}/api/my-team/${session.managerId}/`, {
    cache: 'no-store',
    headers: fplHeaders(session),
  })

  if (!res.ok) {
    throw Object.assign(new Error('Could not load authenticated FPL team. Please reconnect your FPL account.'), { status: res.status })
  }

  return res.json()
}

export async function assertFplDeadlineOpen() {
  const res = await fetch(`${FPL_BASE_URL}/api/bootstrap-static/`, { cache: 'no-store' })
  if (!res.ok) return null

  const bootstrap = await res.json()
  const events: FplEvent[] = Array.isArray(bootstrap?.events) ? bootstrap.events : []
  const now = Date.now()
  const next = events.find((event) => event.is_next) || events.find((event) => !event.finished && Date.parse(event.deadline_time || '') > now)

  if (!next) {
    throw Object.assign(new Error('No editable FPL gameweek is currently available.'), { status: 409 })
  }

  const deadline = Date.parse(next.deadline_time || '')
  if (Number.isFinite(deadline) && deadline <= now) {
    throw Object.assign(new Error(`The GW${next.id} deadline has passed. FPL changes are locked.`), { status: 409 })
  }

  return {
    eventId: Number(next.id),
    deadline: next.deadline_time as string | undefined,
  }
}

export function buildPickPreview(livePicks: FplPick[], desiredPicks: FplPick[], squad: Squad): FplPickPreview {
  const localByElement = new Map<number, Player>()
  for (const player of allLocalPlayers(squad)) {
    const id = normalizeId(player.id)
    if (id) localByElement.set(id, player)
  }

  const liveByElement = new Map(livePicks.map((pick) => [pick.element, pick]))
  const liveElements = new Set(livePicks.map((pick) => pick.element))
  const desiredElements = new Set(desiredPicks.map((pick) => pick.element))
  const changes: FplPickDiffItem[] = []
  const unsupported: FplPickDiffItem[] = []

  if (squad.activeChip) {
    unsupported.push({
      type: 'chip_blocked',
      label: 'Chip activation blocked',
      after: squad.activeChip,
    })
  }

  for (const desired of desiredPicks) {
    if (!liveElements.has(desired.element)) {
      unsupported.push({
        type: 'unsupported_transfer',
        label: 'Transfer detected',
        after: playerLabel(localByElement.get(desired.element)),
      })
    }
  }

  for (const live of livePicks) {
    if (!desiredElements.has(live.element)) {
      unsupported.push({
        type: 'unsupported_transfer',
        label: 'Transfer detected',
        before: `Player ID ${live.element}`,
      })
    }
  }

  if (!unsupported.length) {
    for (const desired of desiredPicks) {
      const live = liveByElement.get(desired.element)
      if (!live) continue
      const player = playerLabel(localByElement.get(desired.element))

      if (live.position !== desired.position) {
        const type = desired.position <= 11 && live.position <= 11 ? 'lineup' : 'bench'
        changes.push({
          type,
          label: desired.position > 11 && live.position > 11 ? 'Bench order change' : 'Lineup change',
          before: `${player}: slot ${live.position}`,
          after: `slot ${desired.position}`,
        })
      }

      if (live.is_captain !== desired.is_captain && desired.is_captain) {
        changes.push({
          type: 'captain',
          label: 'Captain change',
          after: player,
        })
      }

      if (live.is_vice_captain !== desired.is_vice_captain && desired.is_vice_captain) {
        changes.push({
          type: 'vice',
          label: 'Vice-captain change',
          after: player,
        })
      }
    }
  }

  return {
    canApply: unsupported.length === 0,
    changes,
    unsupported,
    desiredPicks,
    livePicks,
  }
}

export async function applyFplPicks(session: StoredFplSession, picks: FplPick[]) {
  const res = await fetch(`${FPL_BASE_URL}/api/my-team/${session.managerId}/`, {
    method: 'POST',
    cache: 'no-store',
    headers: fplHeaders(session, true),
    body: JSON.stringify({
      picks,
      chip: null,
    }),
  })

  const text = await res.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    throw Object.assign(new Error(parseFplError(data)), { status: res.status, data })
  }

  return data
}
