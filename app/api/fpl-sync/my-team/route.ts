import { NextResponse } from 'next/server'
import { requireStoredFplSession } from '@/lib/fpl-session'
import { fetchAuthenticatedMyTeam } from '@/lib/fpl-write'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await requireStoredFplSession()
    const myTeam = await fetchAuthenticatedMyTeam(session)

    return NextResponse.json({
      managerId: session.managerId,
      myTeam,
    })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500
    const message = error instanceof Error ? error.message : 'Failed to load FPL team'
    return NextResponse.json({ error: message }, { status })
  }
}
