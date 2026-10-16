import type { MatchedSignal } from './matching';
import type { ScrapedContent } from './scrapers';

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();

export interface PreparedSignalRow {
  player_name: string;
  player_id: string;
  team: string;
  gameweek: number;
  signal: string;
  adjustment: number;
  confidence: string;
  reason: string;
  source_type: string;
  source_label: string;
}

/** Require a real supporting quote and preserve its source instead of guessing provenance. */
export function prepareSignalRows(signals: MatchedSignal[], content: ScrapedContent[], gameweek: number) {
  const rows = new Map<string, PreparedSignalRow>();
  const ranks: Record<string, number> = { high: 3, medium: 2, low: 1 };
  for (const signal of signals) {
    const source = content[(signal.sourceIndex ?? 0) - 1];
    const quote = normalize(signal.evidence || '');
    if (!source || quote.length < 15 || !normalize(source.text).includes(quote)) continue;
    const key = `${signal.playerId}|${signal.signal}`;
    const existing = rows.get(key);
    if (existing && ranks[existing.confidence] >= ranks[signal.confidence]) continue;
    rows.set(key, {
      player_name: signal.playerName, player_id: signal.playerId, team: signal.team, gameweek,
      signal: signal.signal, adjustment: signal.adjustment, confidence: signal.confidence, reason: signal.reason,
      source_type: source.sourceType, source_label: `${source.source}${source.url ? ` | ${source.url}` : ''}`,
    });
  }
  return [...rows.values()];
}
