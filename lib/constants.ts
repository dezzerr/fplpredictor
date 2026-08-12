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
  AVL: "#95BFE5",
  BOU: "#DA291C",
  BRE: "#E30613",
  BHA: "#0057B8",
  CHE: "#034694",
  COV: "#6CABDD",
  CRY: "#1B458F",
  EVE: "#003399",
  FUL: "#000000",
  HUL: "#F5A623",
  IPS: "#3A64A3",
  LEE: "#1D428A",
  LIV: "#D00027",
  MCI: "#6CABDD",
  MUN: "#DA291C",
  NEW: "#241F20",
  NFO: "#DD0000",
  SUN: "#EB172B",
  TOT: "#132257",
} as const;

/** Default color when team is not found */
export const DEFAULT_TEAM_COLOR = "#9CA3AF";

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
export const TEAM_RATING_BENCHMARK = 8.5;

/** Points per starter for 100% GW rating */
export const GW_RATING_BENCHMARK = 7.5;

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
