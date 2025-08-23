// Mapping utilities between bookmaker names and our internal IDs
// - Teams: map bookmaker team names/aliases -> our short codes (e.g., "Manchester City" -> "MCI")
// - Players: map bookmaker player names/aliases -> our Player.id (optionally scoped by team)
import type { Player } from "@/lib/data";

const TEAM_CODES = new Set<string>([
  "ARS","MCI","MUN","LIV","CHE","NEW","BHA","BRE","AVL","TOT",
  "WHU","CRY","WOL","FUL","NFO","LUT","SHU","EVE","BOU",
]);

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
  if (!TEAM_CODES.has(code)) return;
  teamAliasToCode.set(normalizeKey(alias), code);
}

// seed: code -> itself
for (const c of TEAM_CODES) seedTeam(c, c);

// Common team aliases from bookmakers/APIs
seedTeam("Arsenal", "ARS");
seedTeam("Manchester City", "MCI");
seedTeam("Man City", "MCI");
seedTeam("Man City Women", "MCI");
seedTeam("Manchester Utd", "MUN");
seedTeam("Manchester United", "MUN");
seedTeam("Man Utd", "MUN");
seedTeam("Liverpool", "LIV");
seedTeam("Chelsea", "CHE");
seedTeam("Newcastle", "NEW");
seedTeam("Newcastle United", "NEW");
seedTeam("Brighton", "BHA");
seedTeam("Brighton and Hove Albion", "BHA");
seedTeam("Brentford", "BRE");
seedTeam("Aston Villa", "AVL");
seedTeam("Tottenham", "TOT");
seedTeam("Spurs", "TOT");
seedTeam("West Ham", "WHU");
seedTeam("West Ham United", "WHU");
seedTeam("Crystal Palace", "CRY");
seedTeam("Wolves", "WOL");
seedTeam("Wolverhampton", "WOL");
seedTeam("Fulham", "FUL");
seedTeam("Nottingham Forest", "NFO");
seedTeam("Nottm Forest", "NFO");
seedTeam("Luton", "LUT");
seedTeam("Sheffield United", "SHU");
seedTeam("Sheff Utd", "SHU");
seedTeam("Everton", "EVE");
seedTeam("Bournemouth", "BOU");
seedTeam("AFC Bournemouth", "BOU");

export function mapTeam(nameOrCode: string | undefined | null): string | undefined {
  if (!nameOrCode) return undefined;
  return teamAliasToCode.get(normalizeKey(nameOrCode));
}

export function registerTeamAlias(alias: string, code: string) {
  if (!TEAM_CODES.has(code)) throw new Error(`Unknown team code: ${code}`);
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

// Pre-seed a few common examples (extend over time)
registerPlayerAlias("Erling Haaland", "haaland", "MCI");
registerPlayerAlias("E Haaland", "haaland", "MCI");
registerPlayerAlias("Haaland", "haaland", "MCI");
registerPlayerAlias("Mo Salah", "salah", "LIV");
registerPlayerAlias("M Salah", "salah", "LIV");
registerPlayerAlias("Bukayo Saka", "saka", "ARS");
registerPlayerAlias("Heung-Min Son", "son", "TOT");
registerPlayerAlias("H Son", "son", "TOT");
