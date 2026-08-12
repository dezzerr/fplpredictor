import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateProjectionBase } from '@/lib/productivity'
import { estimatePlayingTime } from '@/lib/playingTime'

test('GW1 blends conservative official EP with reliable prior-season scoring', () => {
  const base = estimateProjectionBase({
    officialExpectedPoints: 4,
    pointsPerAppearance: 6.8,
    starts: 34,
    minutes: 2_953,
    teamMatchesPlayed: 0,
    fixtureFactor: 1.16,
    fixtureCount: 1,
  })
  const playingTime = estimatePlayingTime({
    team: 'MCI',
    starts: 34,
    minutes: 2_953,
    teamMatchesPlayed: 0,
    statusCode: 'a',
    chanceOfPlaying: null,
  })

  assert.equal(base.source, 'preseason-blend')
  assert.ok(base.points > 6)
  assert.ok(base.points * playingTime.factor > 5)
})

test('a low-usage player stays low even when prior points per appearance were useful', () => {
  const base = estimateProjectionBase({
    officialExpectedPoints: 2.3,
    pointsPerAppearance: 3,
    starts: 7,
    minutes: 577,
    teamMatchesPlayed: 0,
    fixtureFactor: 1.33,
    fixtureCount: 1,
  })
  const playingTime = estimatePlayingTime({
    team: 'ARS',
    starts: 7,
    minutes: 577,
    teamMatchesPlayed: 0,
    statusCode: 'a',
    chanceOfPlaying: null,
  })

  assert.ok(base.historicalWeight < 0.15)
  assert.ok(base.points * playingTime.factor < 1)
})

test('current-season EP is not blended backwards and blanks remain zero', () => {
  const currentSeason = estimateProjectionBase({
    officialExpectedPoints: 5.1,
    pointsPerAppearance: 8,
    starts: 2,
    minutes: 180,
    teamMatchesPlayed: 2,
    fixtureFactor: 1.2,
    fixtureCount: 1,
  })
  const blank = estimateProjectionBase({
    officialExpectedPoints: 5.1,
    pointsPerAppearance: 8,
    starts: 30,
    minutes: 2_700,
    teamMatchesPlayed: 0,
    fixtureFactor: 1.2,
    fixtureCount: 0,
  })

  assert.deepEqual(currentSeason, {
    points: 5.1,
    source: 'official-ep',
    historicalWeight: 0,
    historicalFixturePoints: 0,
  })
  assert.equal(blank.points, 0)
})
