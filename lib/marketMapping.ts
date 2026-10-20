// Mapping utilities between bookmaker names and our internal IDs
// - Teams: map bookmaker team names/aliases -> our short codes (e.g., "Manchester City" -> "MCI")
// - Players: map bookmaker player names/aliases -> our Player.id (optionally scoped by team)
import type { Player } from "@/lib/data";

function normalizeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/fc|a\.?f\.?c\.?/g, "") // strip FC/AFC tokens
    .replace(/[^a-z0-9]/g, "") // remove non-alphanumerics
    .trim();
}

// --- Team aliases ---
const teamAliasToCode = new Map<string, string>();

function seedTeam(alias: string, code: string) {
  teamAliasToCode.set(normalizeKey(alias), code);
}

type OfficialTeam = { short_name: string; name: string };

/** Refresh aliases from the current official FPL club list at every load. */
export function seedTeamAliasesFrom(teams: OfficialTeam[]) {
  teamAliasToCode.clear();
  for (const team of teams) {
    seedTeam(team.short_name, team.short_name);
    seedTeam(team.name, team.short_name);
  }

  const currentCodes = new Set(teams.map((team) => team.short_name));
  const aliases: Array<[string, string]> = [
    ['Man City', 'MCI'], ['Manchester City', 'MCI'],
    ['Man Utd', 'MUN'], ['Manchester United', 'MUN'],
    ['Newcastle United', 'NEW'], ['Brighton and Hove Albion', 'BHA'],
    ['Spurs', 'TOT'], ['Tottenham', 'TOT'],
    ['Nottm Forest', 'NFO'], ['Nottingham Forest', 'NFO'],
    ['AFC Bournemouth', 'BOU'],
  ];
  for (const [alias, code] of aliases) if (currentCodes.has(code)) seedTeam(alias, code);
}

export function mapTeam(nameOrCode: string | undefined | null): string | undefined {
  if (!nameOrCode) return undefined;
  return teamAliasToCode.get(normalizeKey(nameOrCode));
}

export function registerTeamAlias(alias: string, code: string) {
  teamAliasToCode.set(normalizeKey(alias), code);
}

// --- Player aliases ---
// Keyed as `${teamCode || '*'}:${normalizedName}` -> internal Player.id
const playerAliasToId = new Map<string, string>();

function playerKey(name: string, teamCode?: string) {
  return `${teamCode ?? "*"}:${normalizeKey(name)}`;
}

export function mapPlayer(name: string | undefined | null, teamCode?: string): string | undefined {
  if (!name) return undefined;
  // Try team-scoped first, then global fallback
  const key1 = playerKey(name, teamCode);
  const key2 = playerKey(name, undefined);
  return playerAliasToId.get(key1) ?? playerAliasToId.get(key2);
}

export function registerPlayerAlias(alias: string, playerId: string, teamCode?: string) {
  // Be tolerant to new-season teams not listed in TEAM_CODES yet; don't throw.
  // We still scope by provided teamCode string to improve matching specificity.
  playerAliasToId.set(playerKey(alias, teamCode), playerId);
}

// Seed aliases for a list of current players (name -> id under their team code)
export function seedPlayerAliasesFrom(players: Player[]) {
  for (const p of players) {
    if (p?.name && p?.id) {
      registerPlayerAlias(p.name, p.id, p.team);
    }
  }
}
