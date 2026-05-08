import { NextResponse } from 'next/server';
import { getStoredFplSession, requireAuthenticatedUser } from '@/lib/fpl-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser().catch(() => null);
    if (!user) {
      return NextResponse.json({ connected: false, reason: 'not_authenticated' });
    }

    const session = await getStoredFplSession(user.id);
    if (!session) {
      return NextResponse.json({ connected: false, reason: 'no_valid_fpl_session' });
    }

    return NextResponse.json({
      connected: true,
      managerId: session.managerId,
      expiresAt: session.expiresAt,
      authType: 'fpl_session',
    });
  } catch (error) {
    console.error('FPL status check error:', error);
    return NextResponse.json({ connected: false, reason: 'error' });
  }
}
