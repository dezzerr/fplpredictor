import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchFplPlayers } from '@/lib/fpl'
import { fetchPlayersWithMarket } from '@/lib/market'
import { oddsCache } from '@/lib/cache'
import { seasonKeyFromEvents } from '@/lib/fplSeason'
import { mapTeam } from '@/lib/marketMapping'
import { useSquadStore } from '@/store/squad'
import type { Player } from '@/lib/data'

const teams = [
  ['ARS', 'Arsenal'], ['AVL', 'Aston Villa'], ['BOU', 'Bournemouth'], ['BRE', 'Brentford'],
  ['BHA', 'Brighton'], ['CHE', 'Chelsea'], ['COV', 'Coventry City'], ['CRY', 'Crystal Palace'],
  ['EVE', 'Everton'], ['FUL', 'Fulham'], ['HUL', 'Hull City'], ['IPS', 'Ipswich Town'],
  ['LEE', 'Leeds'], ['LIV', 'Liverpool'], ['MCI', 'Man City'], ['MUN', 'Man Utd'],
  ['NEW', 'Newcastle'], ['NFO', "Nott'm Forest"], ['TOT', 'Spurs'], ['SUN', 'Sunderland'],
].map(([short_name, name], index) => ({
  id: index + 1,
  short_name,
  name,
  strength_overall_home: 1100 + index * 10,
  strength_overall_away: 1090 + index * 10,
}))

function element(id: number, team: number, web_name: string, penalties_order?: number) {
  return {
    id, team, web_name, second_name: web_name, first_name: 'Test', element_type: 3,
    now_cost: 65, ep_next: '5.2', form: '3.1', status: 'a', minutes: 90,
    selected_by_percent: '12.4', total_points: 10, chance_of_playing_next_round: 100,
    penalties_order, code: id, cost_change_event: 1, transfers_in_event: 1234,
    transfers_out_event: 234, news: '', news_added: '',
  }
}

test('the live universe contains only official current clubs and refreshes promoted aliases', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (url: string | URL) => {
    const href = String(url)
    if (href.includes('bootstrap-static')) {
      return new Response(JSON.stringify({
        teams,
        events: [{ id: 1, is_next: true, deadline_time: '2026-08-21T17:30:00Z', finished: false }],
        elements: [element(101, 7, 'Coventry Midfielder', 1), element(102, 11, 'Hull Midfielder'), element(103, 12, 'Ipswich Midfielder'), element(999, 999, 'Relegated Player')],
      }))
    }
    if (href.includes('fixtures')) return new Response(JSON.stringify([]))
    throw new Error(`Unexpected URL ${href}`)
  }) as typeof fetch

  try {
    const players = await fetchFplPlayers()
    assert.equal(players.length, 3)
    assert.deepEqual(players.map((player) => player.team), ['COV', 'HUL', 'IPS'])
    assert.equal(players[0].teamName, 'Coventry City')
    assert.equal(players[0].price, 6.5)
    assert.equal(players[0].transfersInEvent, 1234)
    assert.equal(players[0].expExplain?.penaltyTakerRank, 0)
    assert.equal(mapTeam('Coventry City'), 'COV')
    assert.equal(mapTeam('Hull City'), 'HUL')
    assert.equal(mapTeam('Ipswich Town'), 'IPS')
    assert.equal(mapTeam('Wolves'), undefined)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('season keys derive from the opening official deadline', () => {
  assert.equal(seasonKeyFromEvents([{ deadline_time: '2026-08-21T17:30:00Z' }]), '2026-27')
})

test('team-only odds cannot collapse same-position players onto one projection', async () => {
  const originalFetch = globalThis.fetch
  const originalOddsKey = process.env.ODDS_API_KEY
  process.env.ODDS_API_KEY = 'test-key'
  oddsCache.clear()

  const marketTeams = teams.slice(0, 2).map((team) => ({ ...team, played: 0 }))
  const established = { ...element(201, 1, 'Established'), starts: 30, minutes: 2_700 }
  const substitute = { ...element(202, 1, 'Substitute'), starts: 0, minutes: 300 }

  globalThis.fetch = (async (url: string | URL) => {
    const href = String(url)
    if (href.includes('bootstrap-static')) {
      return Response.json({
        teams: marketTeams,
        events: [{ id: 1, is_next: true, deadline_time: '2026-08-21T17:30:00Z', finished: false }],
        elements: [established, substitute],
      })
    }
    if (href.includes('fantasy.premierleague.com/api/fixtures')) {
      return Response.json([{
        event: 1,
        team_h: 1,
        team_a: 2,
        team_h_difficulty: 3,
        team_a_difficulty: 3,
        kickoff_time: '2026-08-22T14:00:00Z',
      }])
    }
    if (href.includes('api.the-odds-api.com')) {
      return Response.json([{
        home_team: 'Arsenal',
        away_team: 'Aston Villa',
        bookmakers: [{ markets: [{
          key: 'h2h',
          outcomes: [
            { name: 'Arsenal', price: 1.7 },
            { name: 'Draw', price: 4 },
            { name: 'Aston Villa', price: 5 },
          ],
        }] }],
      }])
    }
    throw new Error(`Unexpected URL ${href}`)
  }) as typeof fetch

  try {
    const players = await fetchPlayersWithMarket()
    const starterProjection = players.find((player) => player.id === '201')!
    const substituteProjection = players.find((player) => player.id === '202')!

    assert.ok(starterProjection.expPoints > substituteProjection.expPoints)
    assert.equal(starterProjection.expExplain?.source, 'fpl')
    assert.equal(substituteProjection.expExplain?.source, 'fpl')
    assert.equal(starterProjection.expExplain?.modelVersion, 'usage-v2')
    assert.equal(starterProjection.minutesProb, starterProjection.playingTime?.sixtyMinuteProbability)
  } finally {
    globalThis.fetch = originalFetch
    oddsCache.clear()
    if (originalOddsKey === undefined) delete process.env.ODDS_API_KEY
    else process.env.ODDS_API_KEY = originalOddsKey
  }
})

test('a season mismatch clears persisted players while same-season data rehydrates them', () => {
  const current: Player = {
    id: '101', name: 'Transferred Player', position: 'MID', team: 'COV', teamName: 'Coventry City',
    price: 7, expPoints: 5, nextFixtures: [], status: 'fit', ownership: 10,
  }
  const legacy: Player = { ...current, team: 'WOL', teamName: 'Wolves', price: 6 }
  useSquadStore.setState({
    seasonKey: null,
    squad: { bank: 4, starters: { GK: [], DEF: [], MID: [legacy], FWD: [] }, bench: [], captainId: '101', viceId: undefined },
    history: [],
  })
  useSquadStore.getState().syncCurrentSeason([current], '2026-27')
  assert.equal(useSquadStore.getState().squad.starters.MID.length, 0)
  assert.equal(useSquadStore.getState().squad.bank, 100)
  assert.equal(useSquadStore.getState().setupSource, null)

  useSquadStore.setState({
    seasonKey: '2026-27',
    squad: { bank: 4, starters: { GK: [], DEF: [], MID: [legacy], FWD: [] }, bench: [], captainId: '101', viceId: undefined },
  })
  useSquadStore.getState().syncCurrentSeason([current], '2026-27')
  assert.deepEqual(useSquadStore.getState().squad.starters.MID[0], current)
})
