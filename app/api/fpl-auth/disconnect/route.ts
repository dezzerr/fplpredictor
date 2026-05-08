import { NextResponse } from 'next/server';
import { deleteFplSession, requireAuthenticatedUser } from '@/lib/fpl-session';

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    await deleteFplSession(user.id);

    return NextResponse.json({
      success: true,
      message: 'FPL account disconnected',
    });
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error
      ? Number((error as { status?: unknown }).status) || 500
      : 500;
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('FPL disconnect error:', error);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
