/**
 * Fuzzy player name matching to link Gemini-extracted signals to FPL player IDs.
 */

import type { Player } from '@/lib/data';
import type { PlayerSignal } from './gemini';

export interface MatchedSignal extends PlayerSignal {
  playerId: string;
}

/**
 * Normalize a name for fuzzy comparison:
 * - lowercase, strip accents/diacritics, remove common prefixes
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '')    // strip special chars
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two names are a fuzzy match.
 * Handles partial matches (e.g. "Salah" matches "Mohamed Salah" or "M. Salah").
 */
function namesMatch(signalName: string, playerName: string): boolean {
  const a = normalize(signalName);
  const b = normalize(playerName);

  // Exact match
  if (a === b) return true;

  // One contains the other
  if (b.includes(a) || a.includes(b)) return true;

  // Split into parts and check last-name match
  const aParts = a.split(/[\s-]+/);
  const bParts = b.split(/[\s-]+/);

  // Last name match (most common: "Salah" matches "M. Salah")
  const aLast = aParts[aParts.length - 1];
  const bLast = bParts[bParts.length - 1];
  if (aLast.length >= 3 && aLast === bLast) return true;

  // Any significant part match (e.g. "Bruno" matches "Bruno Fernandes")
  for (const part of aParts) {
    if (part.length < 3) continue; // skip initials like "m" or "j"
    for (const bPart of bParts) {
      if (bPart.length < 3) continue;
      if (part === bPart) return true;
    }
  }

  return false;
}

/**
 * Match extracted signals to FPL players by name + team.
 * Returns only signals that successfully matched a player.
 */
export function matchSignalsToPlayers(
  signals: PlayerSignal[],
  players: Player[],
): MatchedSignal[] {
  const matched: MatchedSignal[] = [];

  for (const sig of signals) {
    // First try: match by name AND team
    let found = players.find(
      p => p.team === sig.team && namesMatch(sig.playerName, p.name)
    );

    // Second try: match by name only (team code might be slightly off)
    if (!found) {
      found = players.find(p => namesMatch(sig.playerName, p.name));
    }

    if (found) {
      matched.push({ ...sig, playerId: found.id });
    } else {
      console.warn(
        `[Matching] Could not match signal for "${sig.playerName}" (${sig.team})`
      );
    }
  }

  return matched;
}
