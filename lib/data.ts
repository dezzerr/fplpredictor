export type Position = 'GK'|'DEF'|'MID'|'FWD';
export type Fixture = { opp: string; H: boolean; diff: number; event?: number }; // event = actual GW number
export type PlayingStyle = 
  | 'attacking_wb'      // Wing-backs with high attacking output (Porro, Kerkez, Munoz)
  | 'attacking_fb'      // Attacking fullbacks with moderate attacking threat
  | 'balanced_fb'       // Balanced fullbacks - some attacking, some defensive
  | 'defensive_fb'      // Traditional defensive fullbacks
  | 'attacking_cb'      // Centre-backs with goal threat (set pieces, etc.)
  | 'defensive_cb'      // Traditional centre-backs
  | 'sweeper_gk'        // Goalkeepers with distribution/attacking potential  
  | 'traditional_gk'    // Standard goalkeepers
  | 'box_to_box'        // Midfielders who contribute both ends
  | 'attacking_mid'     // Primarily attacking midfielders
  | 'defensive_mid'     // Primarily defensive midfielders
  | 'playmaker'         // Creative midfielders with assist potential
  | 'target_forward'    // Physical strikers, penalty box presence
  | 'pacey_forward'     // Fast strikers who score from counters
  | 'creative_forward'  // Forwards who create and score
  | 'poacher';          // Pure finishers in the box

/** Detailed breakdown of how expected points were calculated */
export type ExpExplain = {
  // Core calculation factors
  base: number;
  minutesProb: number;
  minutesFactor: number;
  injuryPenalty: number;
  form: number;
  formFactor: number;
  positionFactor: number;
  fixtureWeights: Array<{ w: number; d: number; H: boolean; factor: number }>;
  blendedFixtureFactor: number;
  final: number;

  // Week-aware factors
  nextWeekFactor?: number;
  eventFactors?: number[]; // per-event aggregated factor for next 3 events (DGW/blank aware)
  eventFixtureCounts?: number[]; // per-event count of fixtures in next 3 events for this team
  nextEventFixtureCount?: number; // fixtures count in the very next event (0=blank, 2+=double)

  // Penalty taker info
  penaltyBoost?: number;
  penaltyTakerRank?: number;
  calibration?: number;

  // Status metadata for UI
  rawStatus?: string;
  chance?: number | null;
  news?: string;
  newsAdded?: string;

  // Market-first additions
  source?: 'market' | 'fpl'; // which projection source produced expPoints/eventEP
  eventEP?: number[]; // per-event expected points if computed from market model
  lambdaG?: number[]; // per-event attacking goal intensity (Poisson)
  lambdaA?: number[]; // per-event assist intensity proxy
  pCS?: number[]; // per-event clean sheet probability for player's team
  p60?: number[]; // per-event minutes fraction (mins/90)
};

export type Player = {
  id: string;
  name: string;
  position: Position;
  team: string; // short code e.g. LIV, ARS
  price: number; // e.g. 10.5
  expPoints: number; // expected points next GW (refined)
  baseExp?: number; // raw FPL ep_next
  form?: number; // FPL form
  minutesProb?: number; // probability of playing next GW (0-1)
  playingStyle?: PlayingStyle;
  nextFixtures: Fixture[]; // length 3
  status: 'fit'|'flag'|'out';
  eo?: number; // effective ownership %
  ownership?: number; // % selected
  photo?: string; // optional
  eoRisk?: number; // expPoints * (1 - ownership%)
  expExplain?: ExpExplain;
};
export type Squad = {
  bank: number;
  starters: Record<Position, Player[]>; // GK:1, DEF:4, MID:4, FWD:2 (4-4-2 default)
  bench: Player[]; // order: GK, DEF, MID, FWD
  captainId?: string;
  viceId?: string;
};

// Small helper to build fixtures
const F = (opp: string, H: boolean, diff: number): Fixture => ({ opp, H, diff });

/**
 * Get all fixtures for a player at a given week offset, grouped by event.
 * Handles DGW (returns 2+ fixtures), single GW (1 fixture), and blank GW (0 fixtures).
 * 
 * The nextFixtures array is a flat list sorted by event. For DGW, two entries share
 * the same event number. This function groups them properly.
 */
export function getFixturesForWeek(player: Player, weekOffset: number): Fixture[] {
  const fixtures = player.nextFixtures;
  if (!fixtures?.length) return [];

  // If fixtures have event numbers, group by distinct events
  const hasEvents = fixtures.some(f => typeof f.event === 'number');
  if (hasEvents) {
    // Collect distinct event numbers in order
    const events: number[] = [];
    for (const f of fixtures) {
      if (typeof f.event === 'number' && !events.includes(f.event)) {
        events.push(f.event);
      }
    }
    if (weekOffset < events.length) {
      const targetEvent = events[weekOffset];
      return fixtures.filter(f => f.event === targetEvent);
    }
    return [];
  }

  // Fallback: no event numbers, treat each fixture as a separate week
  const f = fixtures[weekOffset];
  return f ? [f] : [];
}

/**
 * Format fixture text for display on player tiles.
 * Single fixture: "BRE (A)"
 * Double GW: "BRE (A), WOL (A)"
 * Blank GW: ""
 */
export function formatFixtureText(fixtures: Fixture[]): string {
  if (!fixtures.length) return '';
  return fixtures.map(f => `${f.opp} (${f.H ? 'H' : 'A'})`).join(', ');
}

/**
 * Get the worst (highest) FDR from a set of fixtures.
 * For DGW, returns the average difficulty for coloring purposes.
 */
export function getFixtureDifficulty(fixtures: Fixture[]): number {
  if (!fixtures.length) return 3;
  if (fixtures.length === 1) return fixtures[0].diff;
  // For DGW, use average difficulty (rounded) for the color band
  return Math.round(fixtures.reduce((sum, f) => sum + f.diff, 0) / fixtures.length);
}

// Playing style multipliers for expected points adjustment
export const PLAYING_STYLE_FACTORS: Record<PlayingStyle, number> = {
  // Defenders
  'attacking_wb': 1.25,      // Wing-backs like Porro, Kerkez, Munoz - significant attacking threat
  'attacking_fb': 1.10,      // Attacking fullbacks with moderate threat
  'balanced_fb': 1.00,       // Standard baseline
  'defensive_fb': 0.85,      // Traditional defensive fullbacks - lower attacking potential
  'attacking_cb': 1.15,      // CBs with set piece threat (Gabriel, VVD)
  'defensive_cb': 0.90,      // Pure defensive CBs
  
  // Goalkeepers
  'sweeper_gk': 1.05,        // GKs with assist/distribution potential
  'traditional_gk': 1.00,    // Standard GKs
  
  // Midfielders
  'box_to_box': 1.10,        // Complete midfielders (Bruno, Rice)
  'attacking_mid': 1.15,     // Primarily attacking (Eze, Palmer)
  'defensive_mid': 0.90,     // Holding midfielders
  'playmaker': 1.12,         // Creative assist machines (De Bruyne, Odegaard)
  
  // Forwards  
  'target_forward': 1.05,    // Physical presence (Watkins)
  'pacey_forward': 1.08,     // Counter-attacking pace (Isak)
  'creative_forward': 1.15,  // Creators and finishers (Son)
  'poacher': 1.20,          // Pure finishers (Haaland)
};

// Helper to calculate realistic expected points accounting for minutes probability and playing style
export function getRealisticExpPoints(player: Player): number {
  const expPoints = player.expPoints ?? 0;
  const minutesProb = player.minutesProb ?? 0.8;
  const styleMultiplier = player.playingStyle ? PLAYING_STYLE_FACTORS[player.playingStyle] : 1.0;
  
  return Math.round(expPoints * minutesProb * styleMultiplier * 10) / 10; // Round to 1 decimal
}

/**
 * SEED DATA - FOR DEVELOPMENT/TESTING ONLY
 * 
 * This hardcoded player list is used as fallback when:
 * 1. FPL API is unavailable during development
 * 2. Running tests without network access
 * 3. Initial app load before API data arrives
 * 
 * In production, all player data comes from the live FPL API via /api/players
 * This data is NOT used for actual predictions or recommendations.
 * 
 * @deprecated Use fetchFplPlayers() or fetchPlayersWithMarket() instead
 */
export const SEED_PLAYERS: Player[] = [
  // Premiums - Guaranteed starters
  { id: 'haaland', name: 'E. Haaland', position: 'FWD', team: 'MCI', price: 14.0, expPoints: 7.5, minutesProb: 0.95, playingStyle: 'poacher', nextFixtures: [F('CHE', false, 4), F('WHU', true, 2), F('BHA', false, 3)], status: 'fit', eo: 110, ownership: 85 },
  { id: 'salah', name: 'M. Salah', position: 'MID', team: 'LIV', price: 14.5, expPoints: 8.2, minutesProb: 0.95, playingStyle: 'creative_forward', nextFixtures: [F('MUN', false, 3), F('BHA', true, 2), F('BRE', false, 3)], status: 'fit', eo: 95, ownership: 55 },
  { id: 'son', name: 'H. Son', position: 'MID', team: 'TOT', price: 10.0, expPoints: 6.2, minutesProb: 0.90, playingStyle: 'creative_forward', nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit', eo: 60, ownership: 35 },
  { id: 'saka', name: 'B. Saka', position: 'MID', team: 'ARS', price: 9.5, expPoints: 6.0, minutesProb: 0.95, playingStyle: 'attacking_mid', nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit', eo: 70, ownership: 40 },
  { id: 'palmer', name: 'C. Palmer', position: 'MID', team: 'CHE', price: 10.5, expPoints: 6.5, minutesProb: 0.90, playingStyle: 'attacking_mid', nextFixtures: [F('MCI', true, 4), F('EVE', false, 2), F('BOU', true, 2)], status: 'fit', eo: 80, ownership: 50 },
  { id: 'foden', name: 'P. Foden', position: 'MID', team: 'MCI', price: 9.0, expPoints: 5.6, minutesProb: 0.85, playingStyle: 'attacking_mid', nextFixtures: [F('CHE', false, 4), F('WHU', true, 2), F('BHA', false, 3)], status: 'fit', eo: 75, ownership: 45 },

  // Forwards - Regular starters
  { id: 'isak', name: 'A. Isak', position: 'FWD', team: 'NEW', price: 10.4, expPoints: 6.1, minutesProb: 0.90, playingStyle: 'pacey_forward', nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit', eo: 65, ownership: 32 },
  { id: 'watkins', name: 'O. Watkins', position: 'FWD', team: 'AVL', price: 9.0, expPoints: 5.8, minutesProb: 0.90, playingStyle: 'target_forward', nextFixtures: [F('CRY', true, 2), F('ARS', false, 4), F('BOU', true, 2)], status: 'fit', eo: 55, ownership: 30 },
  { id: 'toney', name: 'I. Toney', position: 'FWD', team: 'BRE', price: 8.0, expPoints: 5.2, minutesProb: 0.85, playingStyle: 'target_forward', nextFixtures: [F('WOL', true, 2), F('BOU', false, 2), F('CRY', true, 2)], status: 'fit' },
  { id: 'joaopedro', name: 'J. Pedro', position: 'FWD', team: 'BHA', price: 5.5, expPoints: 2.8, minutesProb: 0.70, playingStyle: 'creative_forward', nextFixtures: [F('NFO', true, 2), F('MCI', false, 5), F('WHU', true, 3)], status: 'fit' },
  { id: 'archer', name: 'C. Archer', position: 'FWD', team: 'SHU', price: 4.5, expPoints: 1.2, minutesProb: 0.45, playingStyle: 'pacey_forward', nextFixtures: [F('EVE', true, 3), F('BUR', false, 3), F('BOU', true, 2)], status: 'fit' },

  // Midfielders - Mix of starters and rotation
  { id: 'bowen', name: 'J. Bowen', position: 'MID', team: 'WHU', price: 7.5, expPoints: 5.4, minutesProb: 0.90, playingStyle: 'attacking_mid', nextFixtures: [F('BOU', true, 2), F('MCI', false, 4), F('BHA', true, 3)], status: 'fit' },
  { id: 'mbuemo', name: 'B. Mbeumo', position: 'MID', team: 'BRE', price: 7.0, expPoints: 5.1, minutesProb: 0.85, playingStyle: 'attacking_mid', nextFixtures: [F('WOL', true, 2), F('BOU', false, 2), F('CRY', true, 2)], status: 'fit' },
  { id: 'bruno', name: 'Bruno F.', position: 'MID', team: 'MUN', price: 8.5, expPoints: 5.0, minutesProb: 0.95, playingStyle: 'box_to_box', nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'fit' },
  { id: 'rashford', name: 'M. Rashford', position: 'MID', team: 'MUN', price: 8.5, expPoints: 3.8, minutesProb: 0.75, playingStyle: 'attacking_mid', nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'flag' },
  { id: 'mitoma', name: 'K. Mitoma', position: 'MID', team: 'BHA', price: 6.5, expPoints: 3.7, minutesProb: 0.80, playingStyle: 'attacking_mid', nextFixtures: [F('NFO', true, 2), F('MCI', false, 5), F('WHU', true, 3)], status: 'fit' },
  { id: 'gordon', name: 'A. Gordon', position: 'MID', team: 'NEW', price: 6.5, expPoints: 4.9, minutesProb: 0.85, playingStyle: 'attacking_mid', nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'eze', name: 'E. Eze', position: 'MID', team: 'CRY', price: 6.5, expPoints: 4.7, minutesProb: 0.85, playingStyle: 'playmaker', nextFixtures: [F('AVL', false, 3), F('NFO', true, 2), F('BRE', false, 2)], status: 'fit' },
  { id: 'diaby', name: 'M. Diaby', position: 'MID', team: 'AVL', price: 6.5, expPoints: 3.5, minutesProb: 0.75, playingStyle: 'attacking_mid', nextFixtures: [F('CRY', true, 2), F('ARS', false, 4), F('BOU', true, 2)], status: 'fit' },
  { id: 'neto', name: 'P. Neto', position: 'MID', team: 'WOL', price: 5.5, expPoints: 3.4, minutesProb: 0.80, playingStyle: 'attacking_mid', nextFixtures: [F('BRE', false, 2), F('NEW', false, 3), F('FUL', true, 2)], status: 'fit' },
  { id: 'andreas', name: 'A. Pereira', position: 'MID', team: 'FUL', price: 5.5, expPoints: 3.1, minutesProb: 0.75, playingStyle: 'playmaker', nextFixtures: [F('MUN', false, 3), F('WHU', true, 3), F('NFO', false, 2)], status: 'fit' },
  { id: 'miley', name: 'L. Miley', position: 'MID', team: 'NEW', price: 4.5, expPoints: 1.4, minutesProb: 0.50, playingStyle: 'defensive_mid', nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'nakamba', name: 'M. Nakamba', position: 'MID', team: 'LUT', price: 4.5, expPoints: 1.0, minutesProb: 0.40, playingStyle: 'defensive_mid', nextFixtures: [F('EVE', false, 3), F('BUR', true, 2), F('SHU', false, 2)], status: 'fit' },

  // Defenders - Regular starters and rotation players
  { id: 'trippier', name: 'K. Trippier', position: 'DEF', team: 'NEW', price: 6.5, expPoints: 4.9, minutesProb: 0.90, playingStyle: 'attacking_fb', nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'taa', name: 'T. Alexander-Arnold', position: 'DEF', team: 'LIV', price: 7.0, expPoints: 4.2, minutesProb: 0.80, playingStyle: 'attacking_wb', nextFixtures: [F('MUN', false, 3), F('BHA', true, 2), F('BRE', false, 3)], status: 'flag' },
  { id: 'walker', name: 'K. Walker', position: 'DEF', team: 'MCI', price: 5.5, expPoints: 3.2, minutesProb: 0.80, playingStyle: 'balanced_fb', nextFixtures: [F('CHE', false, 4), F('WHU', true, 2), F('BHA', false, 3)], status: 'fit' },
  { id: 'gabriel', name: 'Gabriel', position: 'DEF', team: 'ARS', price: 5.0, expPoints: 4.3, minutesProb: 0.95, playingStyle: 'attacking_cb', nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'white', name: 'B. White', position: 'DEF', team: 'ARS', price: 5.5, expPoints: 4.1, minutesProb: 0.90, playingStyle: 'attacking_fb', nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'chilwell', name: 'B. Chilwell', position: 'DEF', team: 'CHE', price: 5.5, expPoints: 2.5, minutesProb: 0.60, playingStyle: 'attacking_fb', nextFixtures: [F('MCI', true, 4), F('EVE', false, 2), F('BOU', true, 2)], status: 'flag' },
  { id: 'gusto', name: 'M. Gusto', position: 'DEF', team: 'CHE', price: 4.5, expPoints: 2.9, minutesProb: 0.80, playingStyle: 'balanced_fb', nextFixtures: [F('MCI', true, 4), F('EVE', false, 2), F('BOU', true, 2)], status: 'fit' },
  { id: 'estupinan', name: 'P. Estupiñán', position: 'DEF', team: 'BHA', price: 5.0, expPoints: 3.2, minutesProb: 0.80, playingStyle: 'attacking_fb', nextFixtures: [F('NFO', true, 2), F('MCI', false, 5), F('WHU', true, 3)], status: 'fit' },
  { id: 'trippier2', name: 'S. Botman', position: 'DEF', team: 'NEW', price: 4.5, expPoints: 3.0, minutesProb: 0.80, playingStyle: 'defensive_cb', nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'pinnock', name: 'E. Pinnock', position: 'DEF', team: 'BRE', price: 4.5, expPoints: 3.1, minutesProb: 0.85, playingStyle: 'defensive_cb', nextFixtures: [F('WOL', true, 2), F('BOU', false, 2), F('CRY', true, 2)], status: 'fit' },
  { id: 'cash', name: 'M. Cash', position: 'DEF', team: 'AVL', price: 5.0, expPoints: 3.1, minutesProb: 0.80, playingStyle: 'balanced_fb', nextFixtures: [F('CRY', true, 2), F('ARS', false, 4), F('BOU', true, 2)], status: 'fit' },
  { id: 'vdv', name: 'M. van de Ven', position: 'DEF', team: 'TOT', price: 5.0, expPoints: 2.9, minutesProb: 0.80, playingStyle: 'defensive_cb', nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'udogie', name: 'D. Udogie', position: 'DEF', team: 'TOT', price: 5.0, expPoints: 2.8, minutesProb: 0.80, playingStyle: 'attacking_fb', nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'kabore', name: 'I. Kaboré', position: 'DEF', team: 'LUT', price: 4.0, expPoints: 1.0, minutesProb: 0.40, playingStyle: 'defensive_fb', nextFixtures: [F('EVE', false, 3), F('BUR', true, 2), F('SHU', false, 2)], status: 'fit' },

  // Goalkeepers - Number 1s vs backups
  { id: 'areola', name: 'A. Areola', position: 'GK', team: 'WHU', price: 4.2, expPoints: 3.8, minutesProb: 0.90, playingStyle: 'traditional_gk', nextFixtures: [F('BOU', true, 2), F('MCI', false, 4), F('BHA', true, 3)], status: 'fit' },
  { id: 'leno', name: 'B. Leno', position: 'GK', team: 'FUL', price: 4.5, expPoints: 3.7, minutesProb: 0.95, playingStyle: 'traditional_gk', nextFixtures: [F('MUN', false, 3), F('WHU', true, 3), F('NFO', false, 2)], status: 'fit' },
  { id: 'onana', name: 'A. Onana', position: 'GK', team: 'MUN', price: 5.0, expPoints: 3.9, minutesProb: 0.95, playingStyle: 'sweeper_gk', nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'fit' },
  { id: 'turner', name: 'M. Turner', position: 'GK', team: 'NFO', price: 4.0, expPoints: 1.3, minutesProb: 0.40, playingStyle: 'traditional_gk', nextFixtures: [F('BHA', false, 3), F('BRE', true, 3), F('FUL', true, 2)], status: 'fit' },

  // More depth  
  { id: 'jesus', name: 'Gabriel Jesus', position: 'FWD', team: 'ARS', price: 8.0, expPoints: 4.9, minutesProb: 0.80, playingStyle: 'target_forward', nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'nunez', name: 'D. Núñez', position: 'FWD', team: 'LIV', price: 7.5, expPoints: 5.0, minutesProb: 0.75, playingStyle: 'pacey_forward', nextFixtures: [F('MUN', false, 3), F('BHA', true, 2), F('BRE', false, 3)], status: 'fit' },
  { id: 'martinelli', name: 'G. Martinelli', position: 'MID', team: 'ARS', price: 8.0, expPoints: 4.7, minutesProb: 0.85, playingStyle: 'attacking_mid', nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'maddison', name: 'J. Maddison', position: 'MID', team: 'TOT', price: 7.5, expPoints: 4.8, minutesProb: 0.85, playingStyle: 'playmaker', nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'bowen2', name: 'D. Kudus', position: 'MID', team: 'WHU', price: 7.0, expPoints: 4.6, minutesProb: 0.80, playingStyle: 'attacking_mid', nextFixtures: [F('BOU', true, 2), F('MCI', false, 4), F('BHA', true, 3)], status: 'fit' },
  { id: 'porro', name: 'P. Porro', position: 'DEF', team: 'TOT', price: 5.5, expPoints: 4.1, minutesProb: 0.85, playingStyle: 'attacking_wb', nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'munoz', name: 'D. Muñoz', position: 'DEF', team: 'CRY', price: 5.0, expPoints: 4.2, minutesProb: 0.90, playingStyle: 'attacking_wb', nextFixtures: [F('AVL', false, 3), F('NFO', true, 2), F('BRE', false, 2)], status: 'fit' },
  { id: 'kerkez', name: 'M. Kerkez', position: 'DEF', team: 'BOU', price: 4.5, expPoints: 3.8, minutesProb: 0.85, playingStyle: 'attacking_wb', nextFixtures: [F('WHU', false, 2), F('BRE', true, 2), F('AVL', false, 2)], status: 'fit' },
  { id: 'dalot', name: 'D. Dalot', position: 'DEF', team: 'MUN', price: 5.0, expPoints: 3.6, minutesProb: 0.80, playingStyle: 'balanced_fb', nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'fit' },
  { id: 'burn', name: 'D. Burn', position: 'DEF', team: 'NEW', price: 4.5, expPoints: 3.4, minutesProb: 0.75, playingStyle: 'defensive_cb', nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
];

// Backwards compatibility - alias for existing code
// @deprecated Use SEED_PLAYERS instead to be explicit about seed data
export const players = SEED_PLAYERS;

export const initialSquad: Squad = {
  bank: 100.0,
  starters: {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  },
  bench: [],
  captainId: undefined,
  viceId: undefined,
};
