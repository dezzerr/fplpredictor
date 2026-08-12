import test from 'node:test'
import assert from 'node:assert/strict'
import { runFplDataHealthCheck } from '@/lib/fplHealth'

const teams = Array.from({ length: 20 }, (_, index) => ({
  id: index + 1,
  short_name: `T${String(index + 1).padStart(2, '0')}`,
  name: `Team ${index + 1}`,
}))
const elements = teams.map((team, index) => ({ id: index + 100, team: team.id }))
const fixtures = teams.slice(0, 2).map((team, index) => ({ team_h: team.id, team_a: teams[index + 1]?.id ?? team.id }))

function healthyFetch(url: string | URL): Promise<Response> {
  const href = String(url)
  if (href.includes('bootstrap-static')) return Promise.resolve(Response.json({ teams, elements, events: [{ deadline_time: '2026-08-21T17:30:00Z' }] }))
  if (href.includes('fantasy.premierleague.com/api/fixtures')) return Promise.resolve(Response.json(fixtures))
  if (href.endsWith('/api/players')) return Promise.resolve(Response.json(elements.map((element) => ({
    id: String(element.id), team: teams[element.team - 1].short_name, teamName: teams[element.team - 1].name,
  })), { headers: { 'X-FPL-Season-Key': '2026-27' } }))
  if (href.endsWith('/api/fixtures')) return Promise.resolve(Response.json({ teams: teams.map((team) => ({ team: team.short_name, teamName: team.name, fixtures: [] })) }))
  throw new Error(`Unexpected URL ${href}`)
}

test('daily health check accepts the official 20-team universe and compatible app APIs', async () => {
  const result = await runFplDataHealthCheck({
    appBaseUrl: 'https://preview.example.com',
    fetchImpl: healthyFetch as typeof fetch,
    now: new Date('2026-08-01T00:00:00Z'),
  })
  assert.deepEqual(result, { ok: true, checkedAt: '2026-08-01T00:00:00.000Z', seasonKey: '2026-27', checks: [] })
})

test('daily health check identifies stale clubs in the app player response', async () => {
  const result = await runFplDataHealthCheck({
    appBaseUrl: 'https://preview.example.com',
    fetchImpl: (async (url: string | URL) => {
      const response = await healthyFetch(url)
      if (String(url).endsWith('/api/players')) {
        const body = await response.json() as Array<Record<string, unknown>>
        body[0].team = 'WOL'
        return Response.json(body, { headers: { 'X-FPL-Season-Key': '2026-27' } })
      }
      return response
    }) as typeof fetch,
    now: new Date('2026-08-01T00:00:00Z'),
  })
  assert.equal(result.ok, false)
  assert.match(result.checks.join('\n'), /stale club/)
})
