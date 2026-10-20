import { createClient } from '@supabase/supabase-js';
import { buildPlayerUsageCapture } from '../../lib/playerUsageCapture';
import { getConfiguredSupabaseServiceKey } from '../../lib/supabase/service-key';

const FPL_BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const FPL_FIXTURES_URL = 'https://fantasy.premierleague.com/api/fixtures/';
const UPSERT_BATCH_SIZE = 500;

export default async (): Promise<Response> => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = getConfiguredSupabaseServiceKey();
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ skipped: true, reason: 'supabase_not_configured' });
  }

  const [bootstrapResponse, fixturesResponse] = await Promise.all([
    fetch(FPL_BOOTSTRAP_URL, { cache: 'no-store' }),
    fetch(FPL_FIXTURES_URL, { cache: 'no-store' }),
  ]);
  if (!bootstrapResponse.ok) {
    return Response.json({ error: `FPL bootstrap returned HTTP ${bootstrapResponse.status}` }, { status: 502 });
  }

  const fixtures = fixturesResponse.ok ? await fixturesResponse.json() : [];
  const capture = buildPlayerUsageCapture(await bootstrapResponse.json(), fixtures);
  if (capture.skipReason) {
    return Response.json({
      skipped: true,
      reason: capture.skipReason,
      seasonKey: capture.seasonKey,
      completedGameweek: capture.completedGameweek,
    });
  }
  if (capture.rows.length === 0) {
    return Response.json({ error: 'FPL bootstrap contained no usable players' }, { status: 502 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (let offset = 0; offset < capture.rows.length; offset += UPSERT_BATCH_SIZE) {
    const { error } = await supabase
      .from('player_usage_snapshots')
      .upsert(capture.rows.slice(offset, offset + UPSERT_BATCH_SIZE), {
        onConflict: 'season_key,completed_gameweek,player_id',
        // Preserve the first preseason baseline while still inserting players
        // added to the official game after the initial deployment capture.
        ignoreDuplicates: capture.completedGameweek === 0,
      });
    if (error) {
      console.error('[Player usage capture] Supabase upsert failed:', error.message);
      return Response.json({ error: 'Player usage snapshot could not be stored' }, { status: 500 });
    }
  }

  console.log(
    `[Player usage capture] season=${capture.seasonKey} completedGw=${capture.completedGameweek} rows=${capture.rows.length}`,
  );
  return Response.json({
    ok: true,
    seasonKey: capture.seasonKey,
    completedGameweek: capture.completedGameweek,
    rows: capture.rows.length,
  });
};
