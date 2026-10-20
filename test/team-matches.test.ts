import test from 'node:test'
import assert from 'node:assert/strict'
import { completedTeamMatchCounts } from '@/lib/teamMatches'

test('completed fixture counts ignore stale team.played semantics and preserve doubles and blanks', () => {
  const counts = completedTeamMatchCounts([
    { event: 1, finished: true, team_h: 1, team_a: 2 },
    { event: 2, finished_provisional: true, team_h: 1, team_a: 3 },
    { event: 2, finished: true, team_h: 4, team_a: 1 },
    { event: 3, finished: true, team_h: 2, team_a: 3 },
    { event: 2, finished: false, team_h: 2, team_a: 4 },
  ], 2)

  assert.equal(counts.get(1), 3)
  assert.equal(counts.get(2), 1)
  assert.equal(counts.get(3), 1)
  assert.equal(counts.get(4), 1)
})
