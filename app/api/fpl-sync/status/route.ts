import { NextResponse } from 'next/server'
import { getStoredFplSession, requireAuthenticatedUser } from '@/lib/fpl-session'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireAuthenticatedUser()
    const session = await getStoredFplSession(user.id)

    if (!session) {
      return NextResponse.json({ connected: false, reason: 'no_valid_fpl_session' })
    }

    return NextResponse.json({
      connected: true,
      managerId: session.managerId,
      expiresAt: session.expiresAt,
      authType: 'fpl_session',
    })
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500

    if (status === 401) {
      return NextResponse.json({ connected: false, reason: 'not_authenticated' })
    }

    console.error('FPL sync status error:', error)
    return NextResponse.json({ connected: false, reason: 'error' })
  }
}
