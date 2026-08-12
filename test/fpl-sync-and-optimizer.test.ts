import test from 'node:test'
import assert from 'node:assert/strict'
import type { Player, Position, Squad } from '@/lib/data'
import { pickXIForWeek, weeklyExp } from '@/lib/optimizer'
import { FPL_WRITE_SYNC_UNAVAILABLE_CODE, readOnlyFplSyncStatusResponse, retiredFplWriteSyncResponse } from '@/lib/fpl-sync-retired'

function player(id: number, position: Position, team: string): Player {
  return {
    id: String(id),
    name: `Player ${id}`,
    position,
    team,
    price: 5,
    expPoints: 5,
    nextFixtures: [{ opp: 'OPP', H: true, diff: 3, event: 1 }],
    status: 'fit',
  }
}

function validSquad(): Squad {
  const p = (id: number, position: Position, team: string) => player(id, position, team)

  return {
    bank: 1.5,
    starters: {
      GK: [p(1, 'GK', 'AAA')],
      DEF: [p(3, 'DEF', 'BBB'), p(4, 'DEF', 'CCC'), p(5, 'DEF', 'DDD')],
      MID: [p(6, 'MID', 'EEE'), p(7, 'MID', 'FFF'), p(8, 'MID', 'GGG'), p(9, 'MID', 'HHH')],
      FWD: [p(10, 'FWD', 'III'), p(11, 'FWD', 'JJJ'), p(12, 'FWD', 'KKK')],
    },
    bench: [p(2, 'GK', 'AAA'), p(13, 'DEF', 'BBB'), p(14, 'DEF', 'CCC'), p(15, 'MID', 'DDD')],
    captainId: '10',
    viceId: '6',
  }
}

test('retired FPL write sync response is explicit and does not need request data', async () => {
  const originalFetch = globalThis.fetch
  let upstreamFetches = 0
  globalThis.fetch = (async () => {
    upstreamFetches += 1
    throw new Error('Retired endpoint must not call upstream services')
  }) as typeof fetch

  try {
    const response = retiredFplWriteSyncResponse()
    const body = await response.json() as { code?: string; mode?: string }

    assert.equal(response.status, 410)
    assert.equal(body.code, FPL_WRITE_SYNC_UNAVAILABLE_CODE)
    assert.equal(body.mode, 'team_id_import')
    assert.equal(upstreamFetches, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('FPL sync status reports the stable read-only Team ID mode', async () => {
  const response = readOnlyFplSyncStatusResponse()
  const body = await response.json() as { connected?: boolean; reason?: string; mode?: string }

  assert.equal(response.status, 200)
  assert.equal(body.connected, false)
  assert.equal(body.reason, 'fpl_authorization_unavailable')
  assert.equal(body.mode, 'team_id_import')
})

test('weekly projections preserve blank and double gameweek behaviour', () => {
  const midfielder = player(20, 'MID', 'AAA')
  midfielder.expExplain = {
    base: 5,
    minutesProb: 1,
    minutesFactor: 1,
    injuryPenalty: 1,
    form: 1,
    formFactor: 1,
    positionFactor: 1,
    fixtureWeights: [{ w: 1, d: 3, H: true, factor: 1 }],
    blendedFixtureFactor: 1,
    final: 5,
    nextWeekFactor: 1,
    nextEventFixtureCount: 1,
    eventFactors: [1, 0, 1.2],
    eventFixtureCounts: [1, 0, 2],
  }

  assert.equal(weeklyExp(midfielder, 0), 5)
  assert.equal(weeklyExp(midfielder, 1), 0)
  assert.equal(weeklyExp(midfielder, 2), 12)
})

test('a usage-v2 cameo projection is not erased by a zero 60-minute chance', () => {
  const midfielder = player(21, 'MID', 'AAA')
  midfielder.expPoints = 1.2
  midfielder.minutesProb = 0
  midfielder.playingTime = {
    modelVersion: 'usage-v2', startProbability: 0, appearanceProbability: 0.4,
    sixtyMinuteProbability: 0, expectedMinutes: 20, factor: 0.17,
    source: 'historical', confidence: 'medium', sampleMatches: 6, recentMatches: 0,
  }
  midfielder.expExplain = {
    base: 4, minutesProb: 0, minutesFactor: 0.17, injuryPenalty: 1,
    form: 1, formFactor: 1, positionFactor: 1,
    fixtureWeights: [{ w: 1, d: 3, H: true, factor: 1 }],
    blendedFixtureFactor: 1, final: 1.2, modelVersion: 'usage-v2',
    playingTime: midfielder.playingTime,
    nextWeekFactor: 1, eventFactors: [1, 1], eventFixtureCounts: [1, 1],
  }

  assert.equal(weeklyExp(midfielder, 0), 1.2)
  assert.equal(weeklyExp(midfielder, 1), 1.2)
})

test('optimiser returns a valid starting XI and captain from a valid squad', () => {
  const result = pickXIForWeek(validSquad(), 0)

  assert.equal(result.xi.length, 11)
  assert.equal(result.bench.length, 4)
  assert.ok(result.capId)
  assert.ok(result.xi.some((candidate) => candidate.id === result.capId))
  assert.ok(result.points > 0)
})
