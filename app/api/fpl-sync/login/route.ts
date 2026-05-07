import { NextRequest, NextResponse } from 'next/server'
import { loginToFpl, requireAuthenticatedUser, storeFplSession } from '@/lib/fpl-session'

export const dynamic = 'force-dynamic'

function errorResponse(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status?: unknown }).status) || 500
    : 500
  const message = error instanceof Error ? error.message : 'Failed to connect FPL account'
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const { email, password } = await request.json()

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'FPL email and password are required' }, { status: 400 })
    }

    const login = await loginToFpl({ email: email.trim(), password })
    const expiresAt = await storeFplSession({
      userId: user.id,
      managerId: login.managerId,
      cookies: login.cookies,
    })

    return NextResponse.json({
      success: true,
      managerId: login.managerId,
      teamName: login.teamName,
      playerName: login.playerName,
      expiresAt,
      message: `Successfully connected to ${login.teamName}!`,
    })
  } catch (error) {
    console.error('FPL sync login error:', error)
    return errorResponse(error)
  }
}
