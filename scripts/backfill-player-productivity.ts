import { createClient } from '@supabase/supabase-js';
import { readFile, writeFile } from 'node:fs/promises';

type UsageRow = {
  season_key: string;
  completed_gameweek: number;
  player_id: string;
  team: string;
  team_matches_played: number;
  starts_total: number;
  minutes_total: number;
  captured_at: string;
};

type PastSeason = {
  season_name?: string;
  total_points?: number;
  starts?: number;
  minutes?: number;
};

const BATCH_SIZE = 20;
const FPL_SUMMARY_URL = 'https://fantasy.premierleague.com/api/element-summary';

function previousSeasonName(seasonKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(seasonKey);
  if (!match) throw new Error(`Unsupported season key: ${seasonKey}`);
  const startYear = Number(match[1]) - 1;
  return `${startYear}/${String(startYear + 1).slice(-2)}`;
}

function estimatedAppearances(starts: number, minutes: number): number {
  if (starts <= 0 && minutes <= 0) return 0;
  // Aggregate history does not expose appearances. An 84-minute typical
  // starter spell closely approximates them without overstating substitute
  // productivity; exact FPL PPG is captured directly in future GW0 snapshots.
  return Math.min(38, Math.max(starts, Math.round(minutes / 84), 1));
}

async function fetchPastSeason(playerId: string, expectedSeason: string): Promise<PastSeason | null> {
  const response = await fetch(`${FPL_SUMMARY_URL}/${playerId}/`);
  if (!response.ok) throw new Error(`FPL player ${playerId} returned HTTP ${response.status}`);
  const payload = await response.json() as { history_past?: PastSeason[] };
  return payload.history_past?.find((row) => row.season_name === expectedSeason) || null;
}

async function collectOfficialHistory(seasonKey: string) {
  const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
  if (!bootstrapResponse.ok) throw new Error(`FPL bootstrap returned HTTP ${bootstrapResponse.status}`);
  const bootstrap = await bootstrapResponse.json() as { elements?: Array<{ id?: number }> };
  const playerIds = (bootstrap.elements || [])
    .map((player) => player.id)
    .filter((id): id is number => Number.isInteger(id));
  const expectedSeason = previousSeasonName(seasonKey);
  const updates: Array<{ player_id: string; total_points: number; points_per_appearance: number }> = [];

  for (let offset = 0; offset < playerIds.length; offset += BATCH_SIZE) {
    const batch = playerIds.slice(offset, offset + BATCH_SIZE);
    const histories = await Promise.all(batch.map(async (playerId) => {
      try {
        return await fetchPastSeason(String(playerId), expectedSeason);
      } catch (error) {
        console.warn(`[Productivity backfill] player=${playerId}`, error);
        return null;
      }
    }));
    batch.forEach((playerId, index) => {
      const history = histories[index];
      if (!history) return;
      const starts = Math.max(0, Number(history.starts) || 0);
      const minutes = Math.max(0, Number(history.minutes) || 0);
      const totalPoints = Math.max(0, Number(history.total_points) || 0);
      const appearances = estimatedAppearances(starts, minutes);
      updates.push({
        player_id: String(playerId),
        total_points: totalPoints,
        points_per_appearance: appearances > 0
          ? Math.round((totalPoints / appearances) * 100) / 100
          : 0,
      });
    });
    console.log(`[Productivity backfill] fetched=${Math.min(offset + batch.length, playerIds.length)}/${playerIds.length}`);
  }

  return { seasonKey, expectedSeason, updates };
}

async function main() {
  if (process.argv[2] === '--sql-batch') {
    const inputPath = process.argv[3];
    const offset = Number(process.argv[4]);
    const limit = Number(process.argv[5]);
    if (!inputPath || !Number.isInteger(offset) || !Number.isInteger(limit)) {
      throw new Error('Usage: tsx scripts/backfill-player-productivity.ts --sql-batch <input-json> <offset> <limit>');
    }
    const result = JSON.parse(await readFile(inputPath, 'utf8')) as Awaited<ReturnType<typeof collectOfficialHistory>>;
    const values = result.updates.slice(offset, offset + limit).map((row) => {
      if (!/^\d+$/.test(row.player_id)) throw new Error(`Invalid player id: ${row.player_id}`);
      return `('${row.player_id}',${Math.floor(row.total_points)},${row.points_per_appearance.toFixed(2)})`;
    });
    if (values.length === 0) return;
    process.stdout.write(`with updated as (
  update public.player_usage_snapshots as snapshot
  set total_points = productivity.total_points,
      points_per_appearance = productivity.points_per_appearance
  from (values ${values.join(',')}) as productivity(player_id,total_points,points_per_appearance)
  where snapshot.season_key = '${result.seasonKey}'
    and snapshot.completed_gameweek = 0
    and snapshot.player_id = productivity.player_id
  returning snapshot.player_id
)
select count(*)::integer as updated from updated;`);
    return;
  }

  if (process.argv[2] === '--collect') {
    const seasonKey = process.argv[3];
    const outputPath = process.argv[4];
    if (!seasonKey || !outputPath) {
      throw new Error('Usage: tsx scripts/backfill-player-productivity.ts --collect <season-key> <output-json>');
    }
    const result = await collectOfficialHistory(seasonKey);
    await writeFile(outputPath, JSON.stringify(result));
    console.log(JSON.stringify({
      seasonKey: result.seasonKey,
      expectedSeason: result.expectedSeason,
      outputPath,
      updates: result.updates.length,
    }));
    return;
  }

  const seasonKey = process.argv[2];
  if (!seasonKey) throw new Error('Usage: tsx scripts/backfill-player-productivity.ts <season-key>');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase service environment is not configured');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from('player_usage_snapshots')
    .select('season_key,completed_gameweek,player_id,team,team_matches_played,starts_total,minutes_total,captured_at')
    .eq('season_key', seasonKey)
    .eq('completed_gameweek', 0)
    .is('points_per_appearance', null)
    .order('player_id');
  if (error) throw error;

  const rows = (data || []) as UsageRow[];
  const expectedSeason = previousSeasonName(seasonKey);
  let updated = 0;
  let unavailable = 0;

  for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
    const batch = rows.slice(offset, offset + BATCH_SIZE);
    const histories = await Promise.all(batch.map(async (row) => {
      try {
        return await fetchPastSeason(row.player_id, expectedSeason);
      } catch (error) {
        console.warn(`[Productivity backfill] player=${row.player_id}`, error);
        return null;
      }
    }));

    const updates = batch.flatMap((row, index) => {
      const history = histories[index];
      if (!history) {
        unavailable++;
        return [];
      }
      const starts = Math.max(0, Number(history.starts) || row.starts_total);
      const minutes = Math.max(0, Number(history.minutes) || row.minutes_total);
      const totalPoints = Math.max(0, Number(history.total_points) || 0);
      const appearances = estimatedAppearances(starts, minutes);
      return [{
        ...row,
        total_points: totalPoints,
        points_per_appearance: appearances > 0
          ? Math.round((totalPoints / appearances) * 100) / 100
          : 0,
      }];
    });

    if (updates.length > 0) {
      const { error: upsertError } = await supabase
        .from('player_usage_snapshots')
        .upsert(updates, { onConflict: 'season_key,completed_gameweek,player_id' });
      if (upsertError) throw upsertError;
      updated += updates.length;
    }
    console.log(`[Productivity backfill] processed=${Math.min(offset + batch.length, rows.length)}/${rows.length}`);
  }

  console.log(JSON.stringify({ seasonKey, expectedSeason, candidates: rows.length, updated, unavailable }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
