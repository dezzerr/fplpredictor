import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlayerUsageCapture } from '@/lib/playerUsageCapture'

const player = {
  id: 101,
  team: 1,
  starts: 30,
  minutes: 2_700,
  total_points: 180,
  points_per_game: '5.5',
}

test('preseason usage capture creates an idempotent GW0 baseline', () => {
  const now = new Date('2026-08-12T06:45:00Z')
  const bootstrap = {
    events: [{ id: 1, finished: false, deadline_time: '2026-08-21T17:30:00Z' }],
    teams: [{ id: 1, short_name: 'ARS', played: 0 }],
    elements: [player],
  }

  const first = buildPlayerUsageCapture(bootstrap, [], now)
  const repeated = buildPlayerUsageCapture(bootstrap, [], now)

  assert.deepEqual(repeated, first)
  assert.equal(first.seasonKey, '2026-27')
  assert.equal(first.completedGameweek, 0)
  assert.deepEqual(first.rows[0], {
    season_key: '2026-27',
    completed_gameweek: 0,
    player_id: '101',
    team: 'ARS',
    team_matches_played: 0,
    starts_total: 30,
    minutes_total: 2_700,
    total_points: 180,
    points_per_appearance: 5.5,
    captured_at: now.toISOString(),
  })
})

test('capture waits until the latest started gameweek is fully complete', () => {
  const result = buildPlayerUsageCapture({
    events: [
      { id: 1, finished: true, deadline_time: '2026-08-21T17:30:00Z' },
      { id: 2, finished: false, deadline_time: '2026-08-28T17:30:00Z' },
    ],
    teams: [{ id: 1, short_name: 'ARS', played: 2 }],
    elements: [player],
  }, [], new Date('2026-08-29T06:45:00Z'))

  assert.equal(result.skipReason, 'gameweek_incomplete')
  assert.deepEqual(result.rows, [])
})

test('completed snapshots preserve team match counts across doubles and blanks', () => {
  const result = buildPlayerUsageCapture({
    events: [
      { id: 1, finished: true, deadline_time: '2026-08-21T17:30:00Z' },
      { id: 2, finished: true, deadline_time: '2026-08-28T17:30:00Z' },
      { id: 3, finished: false, deadline_time: '2026-09-04T17:30:00Z' },
    ],
    teams: [
      { id: 1, short_name: 'ARS', played: 0 },
      { id: 2, short_name: 'AVL', played: 0 },
    ],
    elements: [
      { id: 101, team: 1, starts: 3, minutes: 270 },
      { id: 202, team: 2, starts: 1, minutes: 90 },
    ],
  }, [
    { event: 1, finished: true, team_h: 1, team_a: 2 },
    { event: 2, finished: true, team_h: 1, team_a: 3 },
    { event: 2, finished: true, team_h: 4, team_a: 1 },
  ], new Date('2026-08-29T06:45:00Z'))

  assert.equal(result.completedGameweek, 2)
  assert.deepEqual(result.rows.map((row) => row.team_matches_played), [3, 1])
  assert.deepEqual(result.rows.map((row) => row.completed_gameweek), [2, 2])
})

test('season keys isolate otherwise identical snapshots', () => {
  const make = (deadline_time: string) => buildPlayerUsageCapture({
    events: [{ id: 1, finished: false, deadline_time }],
    teams: [{ id: 1, short_name: 'ARS', played: 0 }],
    elements: [player],
  }, [], new Date('2026-08-01T00:00:00Z'))

  assert.equal(make('2026-08-21T17:30:00Z').seasonKey, '2026-27')
  assert.equal(make('2027-08-21T17:30:00Z').seasonKey, '2027-28')
})
