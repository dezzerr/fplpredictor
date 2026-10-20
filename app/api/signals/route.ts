import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimitGuard } from '@/lib/request-security';
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key';

/**
 * GET /api/signals?gw=X
 * Returns player signals for the given gameweek.
 */
export async function GET(request: Request) {
  const protection = await rateLimitGuard(request, 'signals', 60, 60_000);
  if (protection) return protection;

  const { searchParams } = new URL(request.url);
  const gw = parseInt(searchParams.get('gw') || '0');

  if (!gw || gw < 1) {
    return NextResponse.json({ error: 'Missing or invalid gw parameter' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = getConfiguredSupabaseServiceKey() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Signal data is not configured', source: 'unavailable' }, { status: 503 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('player_signals')
      .select('*')
      .eq('gameweek', gw)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Signals API] Supabase error:', error.message);
      return NextResponse.json({ error: 'Signal data is temporarily unavailable', source: 'unavailable' }, { status: 503 });
    }

    return NextResponse.json({ signals: data || [] });
  } catch (err) {
    console.error('[Signals API] Error:', (err as Error).message);
    return NextResponse.json({ error: 'Signal data is temporarily unavailable', source: 'unavailable' }, { status: 503 });
  }
}
