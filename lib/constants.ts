/**
 * Centralized constants for the FPL Companion app.
 * All hardcoded values should be defined here for easy maintenance.
 */

import type { Position } from "@/lib/data";

// ============================================================================
// TEAM CONSTANTS
// ============================================================================

/** Primary kit colors by team short code (hex values) */
export const TEAM_COLORS: Record<string, string> = {
  ARS: "#EF0107",
  MCI: "#6CABDD",
  MUN: "#DA291C",
  LIV: "#D00027",
  CHE: "#034694",
  NEW: "#241F20",
  BHA: "#0057B8",
  BRE: "#E30613",
  AVL: "#95BFE5",
  TOT: "#132257",
  WHU: "#7A263A",
  CRY: "#1B458F",
  WOL: "#FDB913",
  FUL: "#000000",
  NFO: "#DD0000",
  LUT: "#FF5F00",
  SHU: "#EE2737",
  EVE: "#003399",
  BOU: "#DA291C",
  // 2025-26 promoted teams
  LEI: "#003090",
  IPS: "#0044AA",
  SOU: "#D71920",
} as const;

/** Default color when team is not found */
export const DEFAULT_TEAM_COLOR = "#9CA3AF";

/**
 * Team strength ratings (1-5 scale, where 5 = strongest)
 * Based on Premier League season performance and squad quality.
 * Update at the start of each season.
 */
export const TEAM_STRENGTH: Record<string, number> = {
  // Elite tier - consistent top performers
  MCI: 5,
  LIV: 5,
  ARS: 5,
  // Strong tier - top 6 contenders
  CHE: 4.5,
  MUN: 4.5,
  TOT: 4.5,
  // Upper-mid tier - European contenders
  NEW: 4,
  AVL: 4,
  // Mid-upper tier - improving clubs
  BHA: 3.5,
  BRE: 3.5,
  CRY: 3.5,
  BOU: 3.5,
  // Mid tier
  FUL: 3,
  WHU: 3,
  WOL: 3,
  EVE: 3,
  NFO: 3,
  // Lower tier / newly promoted
  BUR: 2.5,
  LEE: 2.5,
  SUN: 2.5,
  LEI: 2.5,
  IPS: 2.5,
  SOU: 2.5,
  LUT: 2.5,
  SHU: 2.5,
} as const;

/**
 * Curated penalty takers per team (short codes).
 * Primary taker first, followed by likely backups.
 * Names should match FPL web_name/second_name.
 */
export const PENALTY_TAKERS: Record<string, string[]> = {
  MCI: ["Haaland", "De Bruyne", "Foden"],
  MUN: ["Fernandes", "Rashford"],
  LIV: ["Salah"],
  ARS: ["Saka", "Odegaard"],
  CHE: ["Palmer", "Sterling"],
  TOT: ["Son", "Maddison"],
  NEW: ["Isak"],
  BHA: ["Pedro"], // Joao Pedro
  AVL: ["Watkins"],
  BRE: ["Toney"],
  WHU: ["Bowen"],
  CRY: ["Eze"],
  NFO: ["Gibbs-White"],
  BOU: ["Solanke"],
  WOL: ["Hwang", "Cunha"],
  FUL: ["Willian"],
  EVE: ["Calvert-Lewin"],
  SHU: [],
  LUT: [],
  BUR: [],
  LEI: [],
  IPS: [],
  SOU: [],
} as const;

// ============================================================================
// SQUAD CONSTRAINTS
// ============================================================================

/** Maximum players allowed from a single club */
export const MAX_PER_CLUB = 3;

/** Total squad size */
export const MAX_SQUAD_SIZE = 15;

/** Maximum players per position in squad */
export const MAX_BY_POSITION: Record<Position, number> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
} as const;

/** Maximum starters per position */
export const STARTERS_MAX: Record<Position, number> = {
  GK: 1,
  DEF: 5,
  MID: 5,
  FWD: 3,
} as const;

/** Minimum starters per position */
export const STARTERS_MIN: Record<Position, number> = {
  GK: 1,
  DEF: 3,
  MID: 3,
  FWD: 1,
} as const;

/** Total number of starters */
export const STARTERS_TOTAL = 11;

/** Bench size */
export const BENCH_SIZE = 4;

/** Required GKs on bench */
export const BENCH_GK_REQUIRED = 1;

/** Maximum defenders on bench */
export const BENCH_DEF_MAX = 2;

// ============================================================================
// RATING THRESHOLDS
// ============================================================================

/** Points per slot for 100% team rating */
export const TEAM_RATING_BENCHMARK = 6.5;

/** Points per starter for 100% GW rating */
export const GW_RATING_BENCHMARK = 6.0;

// ============================================================================
// FPL API MAPPINGS
// ============================================================================

/** Map FPL numeric element_type to Position */
export const FPL_POSITION_MAP: Record<number, Position> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
} as const;

// ============================================================================
// PLAYER NAME MAPPINGS
// ============================================================================

/** Common FPL nickname mappings for display */
export const PLAYER_NICKNAMES: Record<string, string> = {
  "Mohamed Salah": "Salah",
  "Erling Haaland": "Haaland",
  "Kevin De Bruyne": "De Bruyne",
  "Bruno Fernandes": "Bruno F.",
  "Virgil van Dijk": "Van Dijk",
  "Son Heung-min": "Son",
  "Bukayo Saka": "Saka",
  "Martin Ødegaard": "Ødegaard",
  "Marcus Rashford": "Rashford",
  "Harry Kane": "Kane",
  "Alexander Isak": "Isak",
  "Darwin Núñez": "Darwin",
  "Gabriel Jesus": "Jesus",
  "Kai Havertz": "Havertz",
  "Raheem Sterling": "Sterling",
  "Jack Grealish": "Grealish",
  "Phil Foden": "Foden",
  "Mason Mount": "Mount",
  "Declan Rice": "Rice",
  "Casemiro": "Casemiro",
  "N'Golo Kanté": "Kanté",
  "Thiago Silva": "T. Silva",
  "Ruben Dias": "Dias",
  "João Cancelo": "Cancelo",
  "Kyle Walker": "Walker",
  "Andrew Robertson": "Robertson",
  "Trent Alexander-Arnold": "Trent",
  "Aaron Wan-Bissaka": "Wan-Bissaka",
  "Luke Shaw": "Shaw",
  "Reece James": "James",
  "Ben Chilwell": "Chilwell",
  "Alisson Becker": "Alisson",
  "Ederson Moraes": "Ederson",
  "Hugo Lloris": "Lloris",
  "Jordan Pickford": "Pickford",
  "Nick Pope": "Pope",
  "Aaron Ramsdale": "Ramsdale",
} as const;

/** Players who prefer first name display */
export const FIRST_NAME_PREFERRED = [
  "Bruno",
  "Casemiro",
  "Fabinho",
  "Alisson",
  "Ederson",
  "Fred",
  "Gabriel",
  "Jesus",
  "Darwin",
] as const;

/** Common last names that need disambiguation */
export const COMMON_LAST_NAMES = [
  "Silva",
  "Santos",
  "Fernandes",
  "Rodriguez",
] as const;
