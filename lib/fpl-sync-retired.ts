import 'server-only'

import { NextResponse } from 'next/server'

export const FPL_WRITE_SYNC_UNAVAILABLE_CODE = 'fpl_write_sync_unavailable'

const UNAVAILABLE_MESSAGE =
  'Direct FPL changes are unavailable because FPL has not provided a supported third-party authorization flow. Import your team using its public Team ID instead.'

/**
 * Retired FPL write endpoints intentionally do not authenticate, parse request
 * data, or contact FPL. This makes stale clients fail safely without handling
 * passwords or session cookies.
 */
export function retiredFplWriteSyncResponse() {
  return NextResponse.json(
    {
      error: UNAVAILABLE_MESSAGE,
      code: FPL_WRITE_SYNC_UNAVAILABLE_CODE,
      mode: 'team_id_import',
    },
    { status: 410 },
  )
}

export function readOnlyFplSyncStatusResponse() {
  return NextResponse.json({
    connected: false,
    reason: 'fpl_authorization_unavailable',
    mode: 'team_id_import',
  })
}
