import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ connected: false, reason: 'not_authenticated' });
    }

    // Check if user has an FPL session
    const { data: session, error: sessionError } = await supabase
      .from('fpl_sessions')
      .select('manager_id, encrypted_cookies, expires_at')
      .eq('user_id', user.id)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ connected: false, reason: 'no_session' });
    }

    // Check if session is expired
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ 
        connected: false, 
        reason: 'expired',
        managerId: session.manager_id,
      });
    }

    // Optionally validate the session is still valid with FPL
    // (Skip this for performance, only do on actual API calls)
    
    return NextResponse.json({
      connected: true,
      managerId: session.manager_id,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    console.error('FPL status check error:', error);
    return NextResponse.json({ connected: false, reason: 'error' });
  }
}
