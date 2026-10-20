/** Match news to the current official roster; ambiguous names are never guessed. */
import type { PlayerSignal } from './gemini';

export interface SignalPlayer {
  id: string;
  name: string;
  team: string;
  aliases?: string[];
}

export interface MatchedSignal extends PlayerSignal {
  playerId: string;
}

function normalize(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function scoreName(signalName: string, playerName: string): number {
  const a = normalize(signalName);
  const b = normalize(playerName);
  if (!a || !b) return 0;
  if (a === b) return 3;
  // Whole tokens only: "Son" must not match "Johnson".
  const parts = a.split(' ');
  if (parts.every(part => part.length >= 3 && b.split(' ').includes(part))) return 2;
  return 0;
}

export function matchSignalsToPlayers(signals: PlayerSignal[], players: SignalPlayer[]): MatchedSignal[] {
  const matched: MatchedSignal[] = [];
  for (const signal of signals) {
    const candidates = players.filter(p => p.team === signal.team).map(player => ({
      player,
      score: Math.max(...[player.name, ...(player.aliases || [])].map(name => scoreName(signal.playerName, name))),
    })).filter(candidate => candidate.score > 0);
    const best = Math.max(0, ...candidates.map(candidate => candidate.score));
    const winners = candidates.filter(candidate => candidate.score === best);
    if (winners.length !== 1) {
      console.warn(`[Matching] Skipped unmatched or ambiguous player "${signal.playerName}" (${signal.team})`);
      continue;
    }
    const player = winners[0].player;
    matched.push({ ...signal, playerName: player.name, team: player.team, playerId: player.id });
  }
  return matched;
}
