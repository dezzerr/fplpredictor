import { withCache, oddsCache } from "@/lib/cache";
import { mapTeam, mapPlayer } from "@/lib/marketMapping";

// Types for odds data we plan to consume
export type FixtureKey = { home: string; away: string; event: number }; // team codes + GW/event #

export type TeamOdds = {
  fixture: FixtureKey;
  // Market-implied measures
  homeWin: number; // P(H)
  draw: number;    // P(D)
  awayWin: number; // P(A)
  goalLine?: number; // e.g., 2.5
  bttsYes?: number;  // P(BTTS)
};

export type GoalscorerOdds = {
  fixture: FixtureKey;
  playerId: string; // our internal Player.id
  anytime: number;  // probability of scoring at least once
};

// Placeholder: fetch team odds for a given event. Returns empty array if no provider configured.
export async function fetchTeamOdds(event: number): Promise<TeamOdds[]> {
  const hasProvider = Boolean(
    process.env.ODDS_API_KEY || process.env.API_FOOTBALL_KEY || process.env.BETFAIR_APP_KEY
  );
  if (!hasProvider) return [];

  // TODO: Implement provider calls. For now, return [] and rely on FPL fallback.
  return [];
}

// Placeholder: fetch anytime goalscorer odds for a given event. Returns empty array if no provider configured.
export async function fetchGoalscorerOdds(event: number): Promise<GoalscorerOdds[]> {
  const hasProvider = Boolean(
    process.env.ODDS_API_KEY || process.env.API_FOOTBALL_KEY || process.env.BETFAIR_APP_KEY
  );
  if (!hasProvider) return [];

  // TODO: Implement provider calls. For now, return [] and rely on FPL fallback.
  return [];
}

// Example helper: cached fetch wrapper (keyed by route + event)
export async function cachedTeamOdds(event: number): Promise<TeamOdds[]> {
  return withCache(oddsCache, `teamOdds:${event}`, () => fetchTeamOdds(event));
}

export async function cachedGoalscorerOdds(event: number): Promise<GoalscorerOdds[]> {
  return withCache(oddsCache, `scorerOdds:${event}`, () => fetchGoalscorerOdds(event));
}
