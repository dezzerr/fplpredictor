import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateProjectionBase } from '@/lib/productivity'
import { estimatePlayingTime } from '@/lib/playingTime'

test('GW1 blends conservative official EP with reliable prior-season scoring', () => {
  const base = estimateProjectionBase({
    officialExpectedPoints: 4,
    currentPointsPerAppearance: 0,
    currentMatchesPlayed: 0,
    historicalPointsPerAppearance: 6.8,
    historicalStarts: 34,
    historicalMinutes: 2_953,
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
    currentPointsPerAppearance: 0,
    currentMatchesPlayed: 0,
    historicalPointsPerAppearance: 3,
    historicalStarts: 7,
    historicalMinutes: 577,
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

test('current-season scoring is combined with the prior and blanks remain zero', () => {
  const currentSeason = estimateProjectionBase({
    officialExpectedPoints: 4,
    currentPointsPerAppearance: 2,
    currentMatchesPlayed: 1,
    historicalPointsPerAppearance: 6.8,
    historicalStarts: 34,
    historicalMinutes: 2_953,
    teamMatchesPlayed: 1,
    fixtureFactor: 1.2,
    fixtureCount: 1,
  })
  const blank = estimateProjectionBase({
    officialExpectedPoints: 5.1,
    currentPointsPerAppearance: 0,
    currentMatchesPlayed: 0,
    historicalPointsPerAppearance: 8,
    historicalStarts: 30,
    historicalMinutes: 2_700,
    teamMatchesPlayed: 0,
    fixtureFactor: 1.2,
    fixtureCount: 0,
  })

  assert.equal(currentSeason.source, 'season-blend')
  assert.ok(currentSeason.points > 5)
  assert.ok(currentSeason.blendedPointsPerAppearance > 6)
  assert.equal(blank.points, 0)
})
