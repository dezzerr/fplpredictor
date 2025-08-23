export type Position = 'GK'|'DEF'|'MID'|'FWD';
export type Fixture = { opp: string; H: boolean; diff: number };
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
  nextFixtures: Fixture[]; // length 3
  status: 'fit'|'flag'|'out';
  eo?: number; // effective ownership %
  ownership?: number; // % selected
  photo?: string; // optional
  eoRisk?: number; // expPoints * (1 - ownership%)
  expExplain?: {
    base: number;
    minutesProb: number;
    minutesFactor: number;
    injuryPenalty: number;
    form: number;
    formFactor: number;
    positionFactor: number;
    fixtureWeights: Array<{ w: number; d: number; H: boolean; factor: number }>;
    nextWeekFactor?: number;
    eventFactors?: number[]; // per-event aggregated factor for next 3 events (DGW/blank aware)
    eventFixtureCounts?: number[]; // per-event count of fixtures in next 3 events for this team
    nextEventFixtureCount?: number; // fixtures count in the very next event (0=blank, 2+=double)
    blendedFixtureFactor: number;
    // Market-first additions
    source?: 'market' | 'fpl'; // which projection source produced expPoints/eventEP
    eventEP?: number[]; // per-event expected points if computed from market model
    lambdaG?: number[]; // per-event attacking goal intensity (Poisson)
    lambdaA?: number[]; // per-event assist intensity proxy
    pCS?: number[]; // per-event clean sheet probability for player's team
    p60?: number[]; // per-event minutes fraction (mins/90)
    final: number;
  };
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

export const players: Player[] = [
  // Premiums
  { id: 'haaland', name: 'E. Haaland', position: 'FWD', team: 'MCI', price: 14.0, expPoints: 7.5, nextFixtures: [F('CHE', false, 4), F('WHU', true, 2), F('BHA', false, 3)], status: 'fit', eo: 110, ownership: 85 },
  { id: 'salah', name: 'M. Salah', position: 'MID', team: 'LIV', price: 14.5, expPoints: 8.2, nextFixtures: [F('MUN', false, 3), F('BHA', true, 2), F('BRE', false, 3)], status: 'fit', eo: 95, ownership: 55 },
  { id: 'son', name: 'H. Son', position: 'MID', team: 'TOT', price: 10.0, expPoints: 6.2, nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit', eo: 60, ownership: 35 },
  { id: 'saka', name: 'B. Saka', position: 'MID', team: 'ARS', price: 9.5, expPoints: 6.0, nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit', eo: 70, ownership: 40 },
  { id: 'palmer', name: 'C. Palmer', position: 'MID', team: 'CHE', price: 10.5, expPoints: 6.5, nextFixtures: [F('MCI', true, 4), F('EVE', false, 2), F('BOU', true, 2)], status: 'fit', eo: 80, ownership: 50 },
  { id: 'foden', name: 'P. Foden', position: 'MID', team: 'MCI', price: 9.0, expPoints: 5.6, nextFixtures: [F('CHE', false, 4), F('WHU', true, 2), F('BHA', false, 3)], status: 'fit', eo: 75, ownership: 45 },

  // Forwards
  { id: 'isak', name: 'A. Isak', position: 'FWD', team: 'NEW', price: 10.4, expPoints: 6.1, nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit', eo: 65, ownership: 32 },
  { id: 'watkins', name: 'O. Watkins', position: 'FWD', team: 'AVL', price: 9.0, expPoints: 5.8, nextFixtures: [F('CRY', true, 2), F('ARS', false, 4), F('BOU', true, 2)], status: 'fit', eo: 55, ownership: 30 },
  { id: 'toney', name: 'I. Toney', position: 'FWD', team: 'BRE', price: 8.0, expPoints: 5.2, nextFixtures: [F('WOL', true, 2), F('BOU', false, 2), F('CRY', true, 2)], status: 'fit' },
  { id: 'joaopedro', name: 'J. Pedro', position: 'FWD', team: 'BHA', price: 5.5, expPoints: 4.1, nextFixtures: [F('NFO', true, 2), F('MCI', false, 5), F('WHU', true, 3)], status: 'fit' },
  { id: 'archer', name: 'C. Archer', position: 'FWD', team: 'SHU', price: 4.5, expPoints: 2.9, nextFixtures: [F('EVE', true, 3), F('BUR', false, 3), F('BOU', true, 2)], status: 'fit' },

  // Midfielders
  { id: 'bowen', name: 'J. Bowen', position: 'MID', team: 'WHU', price: 7.5, expPoints: 5.4, nextFixtures: [F('BOU', true, 2), F('MCI', false, 4), F('BHA', true, 3)], status: 'fit' },
  { id: 'mbuemo', name: 'B. Mbeumo', position: 'MID', team: 'BRE', price: 7.0, expPoints: 5.1, nextFixtures: [F('WOL', true, 2), F('BOU', false, 2), F('CRY', true, 2)], status: 'fit' },
  { id: 'bruno', name: 'Bruno F.', position: 'MID', team: 'MUN', price: 8.5, expPoints: 5.0, nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'fit' },
  { id: 'rashford', name: 'M. Rashford', position: 'MID', team: 'MUN', price: 8.5, expPoints: 4.8, nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'flag' },
  { id: 'mitoma', name: 'K. Mitoma', position: 'MID', team: 'BHA', price: 6.5, expPoints: 4.6, nextFixtures: [F('NFO', true, 2), F('MCI', false, 5), F('WHU', true, 3)], status: 'fit' },
  { id: 'gordon', name: 'A. Gordon', position: 'MID', team: 'NEW', price: 6.5, expPoints: 4.9, nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'eze', name: 'E. Eze', position: 'MID', team: 'CRY', price: 6.5, expPoints: 4.7, nextFixtures: [F('AVL', false, 3), F('NFO', true, 2), F('BRE', false, 2)], status: 'fit' },
  { id: 'diaby', name: 'M. Diaby', position: 'MID', team: 'AVL', price: 6.5, expPoints: 4.4, nextFixtures: [F('CRY', true, 2), F('ARS', false, 4), F('BOU', true, 2)], status: 'fit' },
  { id: 'neto', name: 'P. Neto', position: 'MID', team: 'WOL', price: 5.5, expPoints: 4.2, nextFixtures: [F('BRE', false, 2), F('NEW', false, 3), F('FUL', true, 2)], status: 'fit' },
  { id: 'andreas', name: 'A. Pereira', position: 'MID', team: 'FUL', price: 5.5, expPoints: 3.9, nextFixtures: [F('MUN', false, 3), F('WHU', true, 3), F('NFO', false, 2)], status: 'fit' },
  { id: 'miley', name: 'L. Miley', position: 'MID', team: 'NEW', price: 4.5, expPoints: 2.8, nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'nakamba', name: 'M. Nakamba', position: 'MID', team: 'LUT', price: 4.5, expPoints: 2.6, nextFixtures: [F('EVE', false, 3), F('BUR', true, 2), F('SHU', false, 2)], status: 'fit' },

  // Defenders
  { id: 'trippier', name: 'K. Trippier', position: 'DEF', team: 'NEW', price: 6.5, expPoints: 4.9, nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'taa', name: 'T. Alexander-Arnold', position: 'DEF', team: 'LIV', price: 7.0, expPoints: 5.2, nextFixtures: [F('MUN', false, 3), F('BHA', true, 2), F('BRE', false, 3)], status: 'flag' },
  { id: 'walker', name: 'K. Walker', position: 'DEF', team: 'MCI', price: 5.5, expPoints: 4.0, nextFixtures: [F('CHE', false, 4), F('WHU', true, 2), F('BHA', false, 3)], status: 'fit' },
  { id: 'gabriel', name: 'Gabriel', position: 'DEF', team: 'ARS', price: 5.0, expPoints: 4.3, nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'white', name: 'B. White', position: 'DEF', team: 'ARS', price: 5.5, expPoints: 4.1, nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'chilwell', name: 'B. Chilwell', position: 'DEF', team: 'CHE', price: 5.5, expPoints: 4.2, nextFixtures: [F('MCI', true, 4), F('EVE', false, 2), F('BOU', true, 2)], status: 'flag' },
  { id: 'gusto', name: 'M. Gusto', position: 'DEF', team: 'CHE', price: 4.5, expPoints: 3.6, nextFixtures: [F('MCI', true, 4), F('EVE', false, 2), F('BOU', true, 2)], status: 'fit' },
  { id: 'estupinan', name: 'P. Estupiñán', position: 'DEF', team: 'BHA', price: 5.0, expPoints: 4.0, nextFixtures: [F('NFO', true, 2), F('MCI', false, 5), F('WHU', true, 3)], status: 'fit' },
  { id: 'trippier2', name: 'S. Botman', position: 'DEF', team: 'NEW', price: 4.5, expPoints: 3.8, nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
  { id: 'pinnock', name: 'E. Pinnock', position: 'DEF', team: 'BRE', price: 4.5, expPoints: 3.7, nextFixtures: [F('WOL', true, 2), F('BOU', false, 2), F('CRY', true, 2)], status: 'fit' },
  { id: 'cash', name: 'M. Cash', position: 'DEF', team: 'AVL', price: 5.0, expPoints: 3.9, nextFixtures: [F('CRY', true, 2), F('ARS', false, 4), F('BOU', true, 2)], status: 'fit' },
  { id: 'vdv', name: 'M. van de Ven', position: 'DEF', team: 'TOT', price: 5.0, expPoints: 3.6, nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'udogie', name: 'D. Udogie', position: 'DEF', team: 'TOT', price: 5.0, expPoints: 3.5, nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'kabore', name: 'I. Kaboré', position: 'DEF', team: 'LUT', price: 4.0, expPoints: 2.5, nextFixtures: [F('EVE', false, 3), F('BUR', true, 2), F('SHU', false, 2)], status: 'fit' },

  // Goalkeepers
  { id: 'areola', name: 'A. Areola', position: 'GK', team: 'WHU', price: 4.2, expPoints: 3.8, nextFixtures: [F('BOU', true, 2), F('MCI', false, 4), F('BHA', true, 3)], status: 'fit' },
  { id: 'leno', name: 'B. Leno', position: 'GK', team: 'FUL', price: 4.5, expPoints: 3.7, nextFixtures: [F('MUN', false, 3), F('WHU', true, 3), F('NFO', false, 2)], status: 'fit' },
  { id: 'onana', name: 'A. Onana', position: 'GK', team: 'MUN', price: 5.0, expPoints: 3.9, nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'fit' },
  { id: 'turner', name: 'M. Turner', position: 'GK', team: 'NFO', price: 4.0, expPoints: 3.2, nextFixtures: [F('BHA', false, 3), F('BRE', true, 3), F('FUL', true, 2)], status: 'fit' },

  // More depth
  { id: 'jesus', name: 'Gabriel Jesus', position: 'FWD', team: 'ARS', price: 8.0, expPoints: 4.9, nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'nunez', name: 'D. Núñez', position: 'FWD', team: 'LIV', price: 7.5, expPoints: 5.0, nextFixtures: [F('MUN', false, 3), F('BHA', true, 2), F('BRE', false, 3)], status: 'fit' },
  { id: 'martinelli', name: 'G. Martinelli', position: 'MID', team: 'ARS', price: 8.0, expPoints: 4.7, nextFixtures: [F('WOL', true, 2), F('NEW', false, 3), F('AVL', true, 3)], status: 'fit' },
  { id: 'maddison', name: 'J. Maddison', position: 'MID', team: 'TOT', price: 7.5, expPoints: 4.8, nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'bowen2', name: 'D. Kudus', position: 'MID', team: 'WHU', price: 7.0, expPoints: 4.6, nextFixtures: [F('BOU', true, 2), F('MCI', false, 4), F('BHA', true, 3)], status: 'fit' },
  { id: 'porro', name: 'P. Porro', position: 'DEF', team: 'TOT', price: 5.5, expPoints: 4.1, nextFixtures: [F('NEW', true, 3), F('FUL', false, 2), F('EVE', true, 2)], status: 'fit' },
  { id: 'dalot', name: 'D. Dalot', position: 'DEF', team: 'MUN', price: 5.0, expPoints: 3.6, nextFixtures: [F('FUL', true, 2), F('NEW', false, 3), F('ARS', true, 4)], status: 'fit' },
  { id: 'burn', name: 'D. Burn', position: 'DEF', team: 'NEW', price: 4.5, expPoints: 3.4, nextFixtures: [F('TOT', false, 3), F('WOL', true, 2), F('MUN', false, 3)], status: 'fit' },
];

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
