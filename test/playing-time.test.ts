import test from 'node:test'
import assert from 'node:assert/strict'
import { estimatePlayingTime, type UsageSnapshot } from '@/lib/playingTime'
import { expectedPlayerMarketPoints } from '@/lib/oddsModel'
import { PRESETS } from '@/lib/calibration'

const estimate = (
  starts: number,
  minutes: number,
  overrides: Partial<Parameters<typeof estimatePlayingTime>[0]> = {},
) => estimatePlayingTime({
  team: 'ARS',
  starts,
  minutes,
  teamMatchesPlayed: 0,
  statusCode: 'a',
  chanceOfPlaying: null,
  ...overrides,
})

test('GW1 prior-season usage separates starters, rotation players, and substitutes', () => {
  const starter = estimate(30, 2_700)
  const rotation = estimate(9, 700)
  const substitute = estimate(0, 300)

  assert.equal(starter.modelVersion, 'usage-v2')
  assert.equal(starter.source, 'historical')
  assert.equal(starter.sampleMatches, 6)
  assert.ok(starter.startProbability > rotation.startProbability)
  assert.ok(rotation.startProbability > substitute.startProbability)
  assert.ok(starter.expectedMinutes > rotation.expectedMinutes)
  assert.ok(rotation.expectedMinutes > substitute.expectedMinutes)
  assert.ok(starter.factor > rotation.factor)
  assert.ok(rotation.factor > substitute.factor)
  assert.equal(starter.sixtyMinuteProbability, Math.min(starter.startProbability, starter.expectedMinutes / 90))
})

test('a player without evidence receives the documented low-confidence neutral prior', () => {
  const newcomer = estimate(0, 0)

  assert.equal(newcomer.source, 'prior')
  assert.equal(newcomer.confidence, 'low')
  assert.equal(newcomer.startProbability, 0.5)
  assert.equal(newcomer.expectedMinutes, 45)
  assert.equal(newcomer.appearanceProbability, 0.75)
  assert.equal(newcomer.sixtyMinuteProbability, 0.5)
  assert.equal(newcomer.factor, 0.55)
})

test('availability and lineup news alter playing time once', () => {
  const healthy = estimate(30, 2_700)
  const doubtful = estimate(30, 2_700, { statusCode: 'd' })
  const numericChance = estimate(30, 2_700, { statusCode: 'd', chanceOfPlaying: 50 })
  const injured = estimate(30, 2_700, {
    signals: [{ signal: 'injured', confidence: 'high' }],
  })
  const confirmedStart = estimate(5, 600, {
    signals: [{ signal: 'starts', confidence: 'high' }],
  })
  const confirmedBench = estimate(30, 2_700, {
    signals: [{ signal: 'benched', confidence: 'high' }],
  })
  const returning = estimate(0, 100, {
    signals: [{ signal: 'returning', confidence: 'high' }],
  })

  assert.ok(Math.abs(doubtful.startProbability - healthy.startProbability * 0.75) < 1e-10)
  assert.ok(Math.abs(numericChance.startProbability - healthy.startProbability * 0.5) < 1e-10)
  assert.equal(injured.expectedMinutes, 0)
  assert.equal(injured.factor, 0)
  assert.ok(confirmedStart.startProbability >= 0.95)
  assert.ok(confirmedStart.expectedMinutes >= 75)
  assert.ok(confirmedBench.startProbability <= 0.05)
  assert.ok(confirmedBench.expectedMinutes <= 25)
  assert.ok(returning.startProbability >= 0.6)
  assert.ok(returning.expectedMinutes >= 55)
})

test('recent starts raise an old substitute and repeated benchings lower an established starter', () => {
  const establishedSnapshots: UsageSnapshot[] = [
    { completedGameweek: 0, team: 'ARS', teamMatchesPlayed: 0, startsTotal: 30, minutesTotal: 2_700 },
    ...Array.from({ length: 6 }, (_, index) => ({
      completedGameweek: index + 1,
      team: 'ARS',
      teamMatchesPlayed: index + 1,
      startsTotal: 30,
      minutesTotal: 2_700,
    })),
  ]
  const oldStarter = estimate(30, 2_700, {
    teamMatchesPlayed: 6,
    snapshots: establishedSnapshots,
  })
  const oldStarterHistory = estimate(30, 2_700)

  const substituteSnapshots: UsageSnapshot[] = [
    { completedGameweek: 0, team: 'ARS', teamMatchesPlayed: 0, startsTotal: 0, minutesTotal: 100 },
    ...Array.from({ length: 5 }, (_, index) => ({
      completedGameweek: index + 1,
      team: 'ARS',
      teamMatchesPlayed: index + 1,
      startsTotal: index + 1,
      minutesTotal: (index + 1) * 90,
    })),
  ]
  const promotedSubstitute = estimate(6, 540, {
    teamMatchesPlayed: 6,
    snapshots: substituteSnapshots,
  })
  const oldSubstituteHistory = estimate(0, 100)

  assert.equal(oldStarter.source, 'recent')
  assert.equal(oldStarter.recentMatches, 6)
  assert.ok(oldStarter.startProbability < oldStarterHistory.startProbability)
  assert.equal(promotedSubstitute.source, 'recent')
  assert.ok(promotedSubstitute.startProbability > oldSubstituteHistory.startProbability)
})

test('a reset current-season start contributes immediately against the GW0 prior', () => {
  const priorOnly = estimate(8, 694)
  const afterCurrentStart = estimate(1, 90, {
    team: 'LIV',
    teamMatchesPlayed: 1,
    snapshots: [{
      completedGameweek: 0,
      team: 'LIV',
      teamMatchesPlayed: 0,
      startsTotal: 8,
      minutesTotal: 694,
    }],
  })

  assert.equal(afterCurrentStart.source, 'recent')
  assert.equal(afterCurrentStart.recentMatches, 1)
  assert.ok(afterCurrentStart.startProbability > priorOnly.startProbability)
  assert.ok(afterCurrentStart.expectedMinutes > priorOnly.expectedMinutes)
})

test('reset, negative, and cross-team snapshot deltas do not become recent evidence', () => {
  const estimateWithBadDeltas = estimate(2, 150, {
    teamMatchesPlayed: 3,
    snapshots: [
      { completedGameweek: 0, team: 'ARS', teamMatchesPlayed: 0, startsTotal: 25, minutesTotal: 2_200 },
      { completedGameweek: 1, team: 'CHE', teamMatchesPlayed: 1, startsTotal: 1, minutesTotal: 90 },
      { completedGameweek: 2, team: 'ARS', teamMatchesPlayed: 2, startsTotal: 30, minutesTotal: 2_600 },
    ],
  })

  assert.equal(estimateWithBadDeltas.source, 'season')
  assert.equal(estimateWithBadDeltas.recentMatches, 0)
})

test('market expected points use appearance, expected minutes, and 60-minute chance separately', () => {
  const projection = expectedPlayerMarketPoints({
    position: 'MID',
    appearanceProbability: 0.8,
    sixtyMinuteProbability: 0.6,
    expectedMinutes: 45,
    lambdaGoal: 0.2,
    lambdaAssist: 0.1,
    lambdaOpp: 1,
    scale: 1,
  })
  const expected = 1.4 + 0.5 * (0.2 * 5 + 0.1 * 3) + 0.6 * Math.exp(-1)

  assert.ok(Math.abs(projection - expected) < 1e-10)
})

test('calibration presets do not add an artificial playing-time floor', () => {
  for (const preset of Object.values(PRESETS)) {
    assert.deepEqual(preset.minutes, { base: 0, scale: 1 })
  }
})
