import test from 'node:test'
import assert from 'node:assert/strict'
import { POST as legacyDisconnect } from '@/app/api/fpl-auth/disconnect/route'
import { GET as legacyStatus } from '@/app/api/fpl-auth/status/route'
import { POST as login } from '@/app/api/fpl-sync/login/route'
import { POST as logout } from '@/app/api/fpl-sync/logout/route'
import { GET as myTeam } from '@/app/api/fpl-sync/my-team/route'
import { POST as picks } from '@/app/api/fpl-sync/picks/route'
import { GET as syncStatus } from '@/app/api/fpl-sync/status/route'
import { POST as transfers } from '@/app/api/fpl-sync/transfers/route'
import { FPL_WRITE_SYNC_UNAVAILABLE_CODE } from '@/lib/fpl-sync-retired'

test('every retired FPL session/write route returns 410 without upstream activity', async () => {
  const originalFetch = globalThis.fetch
  let upstreamFetches = 0
  globalThis.fetch = (async () => {
    upstreamFetches += 1
    throw new Error('Retired route must not call upstream services')
  }) as typeof fetch

  try {
    for (const handler of [login, logout, myTeam, picks, transfers, legacyDisconnect, legacyStatus]) {
      const response = await handler()
      const body = await response.json() as { code?: string }
      assert.equal(response.status, 410)
      assert.equal(body.code, FPL_WRITE_SYNC_UNAVAILABLE_CODE)
    }

    const response = await syncStatus()
    assert.deepEqual(await response.json(), {
      connected: false,
      reason: 'fpl_authorization_unavailable',
      mode: 'team_id_import',
    })
    assert.equal(upstreamFetches, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
