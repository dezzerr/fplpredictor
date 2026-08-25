import { createClient } from '@supabase/supabase-js';
import type { UsageSnapshot } from '@/lib/playingTime';
import { getConfiguredSupabaseServiceKey } from '@/lib/supabase/service-key';

type UsageSnapshotRow = {
  completed_gameweek: number;
  player_id: string;
  team: string;
  team_matches_played: number;
  starts_total: number;
  minutes_total: number;
  total_points: number | string | null;
  points_per_appearance: number | string | null;
};

/**
 * Reads recent operational usage data with the server-only service role.
 * Missing configuration, grants, or rows deliberately degrade to an empty map.
 */
export async function fetchPlayerUsageHistory(
  seasonKey: string,
  planningGameweek: number,
): Promise<Map<string, UsageSnapshot[]>> {
  const result = new Map<string, UsageSnapshot[]>();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = getConfiguredSupabaseServiceKey();
  if (!url || !key || seasonKey === 'unknown') return result;

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const minimumGameweek = Math.max(0, planningGameweek - 8);
    const { data, error } = await supabase
      .from('player_usage_snapshots')
      .select('completed_gameweek,player_id,team,team_matches_played,starts_total,minutes_total,total_points,points_per_appearance')
      .eq('season_key', seasonKey)
      .gte('completed_gameweek', minimumGameweek)
      .order('completed_gameweek', { ascending: true });

    if (error) throw error;
    for (const row of (data || []) as UsageSnapshotRow[]) {
      const snapshots = result.get(row.player_id) || [];
      snapshots.push({
        completedGameweek: row.completed_gameweek,
        team: row.team,
        teamMatchesPlayed: row.team_matches_played,
        startsTotal: row.starts_total,
        minutesTotal: row.minutes_total,
        totalPoints: row.total_points == null ? undefined : Number(row.total_points),
        pointsPerAppearance: row.points_per_appearance == null
          ? undefined
          : Number(row.points_per_appearance),
      });
      result.set(row.player_id, snapshots);
    }
  } catch (error) {
    console.warn('[FPL] Player usage history unavailable:', error instanceof Error ? error.message : String(error));
  }

  return result;
}
