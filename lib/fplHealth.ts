import { seasonKeyFromEvents } from '@/lib/fplSeason'

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api'

type FetchLike = typeof fetch

type FplTeam = { id: number; short_name: string; name: string }
type FplElement = { id: number; team: number }
type Bootstrap = { teams?: FplTeam[]; elements?: FplElement[]; events?: Array<{ deadline_time?: string | null }> }

export type FplHealthResult = {
  ok: boolean
  checkedAt: string
  seasonKey: string | null
  checks: string[]
}

function append(checks: string[], condition: unknown, message: string) {
  if (!condition) checks.push(message)
}

async function readJson(response: Response, label: string, checks: string[]): Promise<unknown> {
  if (!response.ok) {
    checks.push(`${label} returned HTTP ${response.status}`)
    return null
  }
  try {
    return await response.json()
  } catch {
    checks.push(`${label} returned invalid JSON`)
    return null
  }
}

/**
 * Read-only validation of the official feed and the deployed public API.
 * The function intentionally does not persist player, fixture, or squad data.
 */
export async function runFplDataHealthCheck({
  appBaseUrl,
  fetchImpl = fetch,
  now = new Date(),
}: {
  appBaseUrl: string
  fetchImpl?: FetchLike
  now?: Date
}): Promise<FplHealthResult> {
  const checks: string[] = []
  const checkedAt = now.toISOString()
  let seasonKey: string | null = null

  try {
    const cacheBuster = now.getTime()
    const [bootstrapResponse, fixturesResponse] = await Promise.all([
      fetchImpl(`${FPL_BASE_URL}/bootstrap-static/?t=${cacheBuster}`, { cache: 'no-store' }),
      fetchImpl(`${FPL_BASE_URL}/fixtures/?t=${cacheBuster}`, { cache: 'no-store' }),
    ])
    const [bootstrapJson, fixturesJson] = await Promise.all([
      readJson(bootstrapResponse, 'Official FPL bootstrap', checks),
      readJson(fixturesResponse, 'Official FPL fixtures', checks),
    ])
    const bootstrap = bootstrapJson as Bootstrap | null
    const teams = Array.isArray(bootstrap?.teams) ? bootstrap.teams : []
    const elements = Array.isArray(bootstrap?.elements) ? bootstrap.elements : []
    const fixtures = Array.isArray(fixturesJson) ? fixturesJson : []
    const teamIds = new Set(teams.map((team) => team.id))
    const teamCodes = new Set(teams.map((team) => team.short_name))
    const teamNameByCode = new Map(teams.map((team) => [team.short_name, team.name]))

    append(checks, teams.length === 20, `Official FPL bootstrap has ${teams.length} teams instead of 20`)
    append(checks, teamIds.size === teams.length && teamCodes.size === teams.length, 'Official FPL teams have duplicate IDs or short names')
    append(checks, elements.length > 0, 'Official FPL bootstrap has no players')
    append(checks, elements.every((element) => teamIds.has(element.team)), 'Official FPL bootstrap contains players for absent teams')
    append(checks, fixtures.length > 0, 'Official FPL fixtures has no fixture rows')
    append(checks, fixtures.every((fixture: any) => teamIds.has(fixture.team_h) && teamIds.has(fixture.team_a)), 'Official FPL fixtures reference absent teams')

    const derivedSeasonKey = seasonKeyFromEvents(bootstrap?.events)
    seasonKey = derivedSeasonKey === 'unknown' ? null : derivedSeasonKey
    append(checks, /^\d{4}-\d{2}$/.test(derivedSeasonKey), 'Official FPL bootstrap has no valid opening deadline season key')

    if (checks.length === 0) {
      const baseUrl = appBaseUrl.replace(/\/$/, '')
      const [playersResponse, appFixturesResponse] = await Promise.all([
        fetchImpl(`${baseUrl}/api/players`, { cache: 'no-store' }),
        fetchImpl(`${baseUrl}/api/fixtures`, { cache: 'no-store' }),
      ])
      const [playersJson, appFixturesJson] = await Promise.all([
        readJson(playersResponse, 'App players API', checks),
        readJson(appFixturesResponse, 'App fixtures API', checks),
      ])
      const players = Array.isArray(playersJson) ? playersJson : []
      const appFixtureTeams = Array.isArray((appFixturesJson as { teams?: unknown[] } | null)?.teams)
        ? (appFixturesJson as { teams: any[] }).teams
        : []

      append(checks, playersResponse.headers.get('X-FPL-Season-Key') === derivedSeasonKey, 'App players API season key does not match the official FPL season')
      append(checks, players.length === elements.length, 'App players API player count does not match the official FPL universe')
      append(checks, players.every((player: any) => teamCodes.has(player.team) && teamNameByCode.get(player.team) === player.teamName), 'App players API contains a stale club or mismatched team name')
      append(checks, appFixtureTeams.length === teams.length, 'App fixtures API team count does not match the official FPL universe')
      append(checks, appFixtureTeams.every((team: any) => teamCodes.has(team.team) && teamNameByCode.get(team.team) === team.teamName && Array.isArray(team.fixtures)), 'App fixtures API contains a stale club, mismatched team name, or invalid fixtures')
    }
  } catch (error) {
    checks.push(`Health check failed unexpectedly: ${error instanceof Error ? error.message : String(error)}`)
  }

  return { ok: checks.length === 0, checkedAt, seasonKey, checks }
}
