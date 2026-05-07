import { NextRequest, NextResponse } from 'next/server'
import { requireStoredFplSession } from '@/lib/fpl-session'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  applyFplPicks,
  assertFplDeadlineOpen,
  buildDesiredPicksFromSquad,
  buildPickPreview,
  fetchAuthenticatedMyTeam,
} from '@/lib/fpl-write'
import type { Json } from '@/lib/supabase/database.types'
import type { Squad } from '@/lib/data'

export const dynamic = 'force-dynamic'

type PicksRequest = {
  squad?: Squad
  apply?: boolean
}

async function auditSync(args: {
  userId: string
  managerId: number
  eventId?: number
  summary?: Json
  statusCode?: number
  success: boolean
  error?: string
}) {
  try {
    const admin = createAdminClient()
    await admin.from('fpl_sync_audit').insert({
      user_id: args.userId,
      manager_id: args.managerId,
      action: 'picks',
      event_id: args.eventId ?? null,
      summary: args.summary ?? null,
      status_code: args.statusCode ?? null,
      success: args.success,
      error: args.error ?? null,
    })
  } catch (error) {
    console.error('FPL sync audit error:', error)
  }
}

function errorResponse(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error
    ? Number((error as { status?: unknown }).status) || 500
    : 500
  const message = error instanceof Error ? error.message : 'Failed to sync FPL picks'
  return NextResponse.json({ error: message }, { status })
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireStoredFplSession()
    const body = (await request.json()) as PicksRequest

    if (!body.squad) {
      return NextResponse.json({ error: 'A squad payload is required' }, { status: 400 })
    }

    const deadline = await assertFplDeadlineOpen()
    const desiredPicks = buildDesiredPicksFromSquad(body.squad)
    const liveTeam = await fetchAuthenticatedMyTeam(session)
    const livePicks = Array.isArray(liveTeam.picks) ? liveTeam.picks : []

    if (livePicks.length !== 15) {
      return NextResponse.json({ error: 'FPL did not return a complete editable team.' }, { status: 502 })
    }

    const preview = buildPickPreview(livePicks, desiredPicks, body.squad)

    if (!body.apply) {
      return NextResponse.json({
        success: true,
        mode: 'preview',
        managerId: session.managerId,
        deadline,
        preview,
      })
    }

    if (!preview.canApply) {
      await auditSync({
        userId: session.userId,
        managerId: session.managerId,
        eventId: deadline?.eventId,
        summary: { unsupported: preview.unsupported },
        statusCode: 409,
        success: false,
        error: 'unsupported_transfer',
      })

      return NextResponse.json({
        error: 'Transfers are not supported by this first Apply to FPL release. Restore your live FPL team or apply lineup-only changes.',
        preview,
      }, { status: 409 })
    }

    if (preview.changes.length === 0) {
      await auditSync({
        userId: session.userId,
        managerId: session.managerId,
        eventId: deadline?.eventId,
        summary: { changes: [] },
        statusCode: 200,
        success: true,
      })

      return NextResponse.json({
        success: true,
        mode: 'apply',
        managerId: session.managerId,
        deadline,
        preview,
        message: 'Your local squad already matches FPL.',
      })
    }

    const result = await applyFplPicks(session, desiredPicks)
    const refreshedTeam = await fetchAuthenticatedMyTeam(session)

    await auditSync({
      userId: session.userId,
      managerId: session.managerId,
      eventId: deadline?.eventId,
      summary: { changes: preview.changes },
      statusCode: 200,
      success: true,
    })

    return NextResponse.json({
      success: true,
      mode: 'apply',
      managerId: session.managerId,
      deadline,
      preview,
      result,
      myTeam: refreshedTeam,
      message: 'FPL team updated successfully.',
    })
  } catch (error) {
    console.error('FPL picks sync error:', error)
    return errorResponse(error)
  }
}
