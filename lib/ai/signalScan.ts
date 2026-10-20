import { createClient } from '@supabase/supabase-js';
import { extractSignals, type PlayerSignal } from './gemini';
import { matchSignalsToPlayers, type MatchedSignal, type SignalPlayer } from './matching';
import { prepareSignalRows, type PreparedSignalRow } from './signalRows';
import type { ScrapedContent } from './scrapers';

export interface OfficialRoster {
  gameweek: number;
  players: SignalPlayer[];
}

export interface ProcessedSignals {
  rawSignals: PlayerSignal[];
  matchedSignals: MatchedSignal[];
  rows: PreparedSignalRow[];
}

export async function fetchOfficialRoster(): Promise<OfficialRoster> {
  const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`FPL bootstrap failed with HTTP ${response.status}`);

  const bootstrap = await response.json() as {
    events?: Array<{ id: number; is_next?: boolean; is_current?: boolean }>;
    teams?: Array<{ id: number; short_name: string }>;
    elements?: Array<{ id: number; team: number; web_name: string; first_name: string; second_name: string }>;
  };
  const next = bootstrap.events?.find((event) => event.is_next);
  const current = bootstrap.events?.find((event) => event.is_current);
  const gameweek = next?.id ?? current?.id;
  if (!gameweek) throw new Error('Could not determine the planning Gameweek');
  const teams = new Map((bootstrap.teams || []).map((team) => [team.id, team.short_name]));
  const players = (bootstrap.elements || [])
    .filter((player) => teams.has(player.team))
    .map((player) => ({
      id: String(player.id),
      name: player.web_name,
      team: teams.get(player.team)!,
      aliases: [`${player.first_name} ${player.second_name}`],
    }));
  if (!players.length) throw new Error('Official FPL roster was empty');
  return { gameweek, players };
}

export async function processSignalContent(
  content: ScrapedContent[],
  gameweek: number,
  players: SignalPlayer[],
): Promise<ProcessedSignals> {
  const rawSignals = await extractSignals(content, { gameweek, players });
  const matchedSignals = matchSignalsToPlayers(rawSignals, players);
  const rows = prepareSignalRows(matchedSignals, content, gameweek);
  return { rawSignals, matchedSignals, rows };
}

export async function upsertSignalRows(
  rows: PreparedSignalRow[],
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<number> {
  if (!rows.length) return 0;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from('player_signals').upsert(rows, {
    onConflict: 'player_name,team,gameweek,signal',
  }).select('player_id');
  if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  const upserted = data?.length || 0;
  if (upserted !== rows.length) throw new Error('Supabase returned an unexpected signal count');

  const playerIds = [...new Set(rows.map((row) => row.player_id))];
  const { data: readBack, error: readBackError } = await supabase
    .from('player_signals')
    .select('player_id, player_name, team, gameweek, signal')
    .eq('gameweek', rows[0].gameweek)
    .in('player_id', playerIds);
  if (readBackError) throw new Error(`Supabase read-back failed: ${readBackError.message}`);
  const keys = new Set((readBack || []).map((row) => `${row.player_id}|${row.player_name}|${row.team}|${row.gameweek}|${row.signal}`));
  for (const row of rows) {
    const key = `${row.player_id}|${row.player_name}|${row.team}|${row.gameweek}|${row.signal}`;
    if (!keys.has(key)) throw new Error(`Supabase read-back missing signal: ${key}`);
  }
  return upserted;
}
