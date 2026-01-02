"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Player, Position, Squad } from "@/lib/data";
import { weeklyExp, pickXIForWeek } from "@/lib/optimizer";
import {
  MAX_PER_CLUB,
  MAX_SQUAD_SIZE,
  MAX_BY_POSITION,
  STARTERS_MAX,
  STARTERS_MIN,
  STARTERS_TOTAL,
  BENCH_SIZE,
  BENCH_GK_REQUIRED,
  BENCH_DEF_MAX,
  TEAM_RATING_BENCHMARK,
  GW_RATING_BENCHMARK,
} from "@/lib/constants";

export type SquadState = {
  squad: Squad;
  loading: boolean;
  error: string | null;
  lastImport: { entryId: string; preset?: string } | null;
  selectedPlayerId: string | null;
  // Undo history
  history: Squad[];
  canUndo: () => boolean;
  undo: () => void;
  pushHistory: () => void;
  initialize: (args: { entryId: string; preset?: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
  refresh: () => Promise<{ ok: true } | { ok: false; error: string }>;
  addPlayer: (p: Player) => { ok: boolean; reason?: string };
  addPlayerToBench: (p: Player) => { ok: boolean; reason?: string };
  removePlayer: (id: string) => void;
  makeCaptain: (id: string) => void;
  makeVice: (id: string) => void;
  moveToBench: (id: string) => { ok: boolean; reason?: string };
  moveToPitch: (id: string, position: Position) => { ok: boolean; reason?: string };
  placeOnPitch: (id: string, position: Position, replaceIndex?: number) => { ok: boolean; reason?: string };
  setBank: (v: number) => void;
  selectPlayer: (id: string | null) => void;
  swapPlayers: (targetId: string) => { ok: boolean; reason?: string };
  replaceSquad: (s: Squad) => void;
  syncPrices: (players: Player[]) => void;
  autoSelectBestXI: (weekOffset: number) => void;
  // selectors
  totalExpPoints: () => number;
  teamRating: () => number; // 0-100 simple heuristic (current week)
  gwRating: () => number; // 0-100 simple heuristic (current week)
  counts: () => { total: number; byClub: Record<string, number>; byPos: Record<Position, number> };
  // week-aware selectors (use weeklyExp)
  startersExpForWeek: (weekOffset: number) => number;
  benchExpForWeek: (weekOffset: number) => number;
  totalExpForWeek: (weekOffset: number) => number; // includes captain double if captain starts
  totalExpWithBenchBoostForWeek: (weekOffset: number) => number;
  teamRatingForWeek: (weekOffset: number) => number; // 0-100 week-aware rating
  gwRatingForWeek: (weekOffset: number) => number; // 0-100 week-aware rating
};

function precision2(n: number) {
  return Math.round(n * 100) / 100;
}

// ============================================================================
// SQUAD HELPER FUNCTIONS
// ============================================================================

/** Get all starters as a flat array */
function getStarters(s: Squad): Player[] {
  return [
    ...s.starters.GK,
    ...s.starters.DEF,
    ...s.starters.MID,
    ...s.starters.FWD,
  ];
}

/** Get all players (starters + bench) as a flat array */
function flattenSquad(s: Squad): Player[] {
  return [...getStarters(s), ...s.bench];
}

/** Count starters by position */
function startersCounts(s: Squad) {
  const byPos: Record<Position, number> = {
    GK: s.starters.GK.length,
    DEF: s.starters.DEF.length,
    MID: s.starters.MID.length,
    FWD: s.starters.FWD.length,
  };
  const total = byPos.GK + byPos.DEF + byPos.MID + byPos.FWD;
  return { total, byPos };
}

/** Count bench players by position */
function benchCounts(s: Squad) {
  const byPos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of s.bench) byPos[p.position]++;
  return { total: s.bench.length, byPos };
}

/** Validate that a formation meets FPL rules */
function validateFormation(byPos: Record<Position, number>): { valid: true } | { valid: false; reason: string } {
  if (byPos.GK < STARTERS_MIN.GK || byPos.GK > STARTERS_MAX.GK) {
    return { valid: false, reason: "Exactly 1 goalkeeper must start" };
  }
  if (byPos.DEF < STARTERS_MIN.DEF || byPos.DEF > STARTERS_MAX.DEF) {
    return { valid: false, reason: "You must play between 3 and 5 defenders" };
  }
  if (byPos.MID < STARTERS_MIN.MID || byPos.MID > STARTERS_MAX.MID) {
    return { valid: false, reason: "You must play between 3 and 5 midfielders" };
  }
  if (byPos.FWD < STARTERS_MIN.FWD || byPos.FWD > STARTERS_MAX.FWD) {
    return { valid: false, reason: "You must play between 1 and 3 forwards" };
  }
  return { valid: true };
}

/** Calculate projected formation after a swap */
function getFormationAfterSwap(
  currentByPos: Record<Position, number>,
  outgoingPos: Position,
  incomingPos: Position
): Record<Position, number> {
  const next = { ...currentByPos };
  if (outgoingPos !== incomingPos) {
    next[outgoingPos] -= 1;
    next[incomingPos] += 1;
  }
  return next;
}

/** Validate bench constraints after a swap */
function validateBenchAfterSwap(
  benchByPos: Record<Position, number>,
  leavingBenchPos: Position | null,
  joiningBenchPos: Position | null
): { valid: true } | { valid: false; reason: string } {
  let nextGK = benchByPos.GK;
  let nextDEF = benchByPos.DEF;

  if (leavingBenchPos === "GK") nextGK--;
  if (joiningBenchPos === "GK") nextGK++;
  if (leavingBenchPos === "DEF") nextDEF--;
  if (joiningBenchPos === "DEF") nextDEF++;

  if (nextGK !== BENCH_GK_REQUIRED) {
    return { valid: false, reason: "Bench must have exactly 1 GK" };
  }
  if (nextDEF > BENCH_DEF_MAX) {
    return { valid: false, reason: "Max 2 defenders on bench" };
  }
  return { valid: true };
}

type PlayerArea = Position | "BENCH";
type PlayerLocation = 
  | { area: PlayerArea; index: number }
  | { area: null; index: -1 };

function findPlayerIndex(s: Squad, id: string): PlayerLocation {
  for (const pos of ["GK", "DEF", "MID", "FWD"] as const) {
    const idx = s.starters[pos].findIndex(p => p.id === id);
    if (idx !== -1) return { area: pos, index: idx };
  }
  const bIdx = s.bench.findIndex(p => p.id === id);
  if (bIdx !== -1) return { area: "BENCH", index: bIdx };
  return { area: null, index: -1 };
}

const MAX_HISTORY = 20; // Keep last 20 states for undo

export const useSquadStore = create<SquadState>()(persist((set, get) => ({
  squad: {
    bank: 0,
    starters: { GK: [], DEF: [], MID: [], FWD: [] },
    bench: [],
    captainId: undefined,
    viceId: undefined,
  },
  loading: false,
  error: null,
  lastImport: null,
  selectedPlayerId: null,
  history: [],
  
  canUndo: () => get().history.length > 0,
  
  undo: () => {
    const history = get().history;
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({ 
      squad: previous, 
      history: history.slice(0, -1),
      selectedPlayerId: null 
    });
  },
  
  pushHistory: () => {
    const current = structuredClone(get().squad);
    const history = get().history;
    // Keep only last MAX_HISTORY states
    const newHistory = [...history.slice(-(MAX_HISTORY - 1)), current];
    set({ history: newHistory });
  },
  
  initialize: async ({ entryId, preset }) => {
    set({ loading: true, error: null });
    try {
      // Add cache busting parameter to force fresh data
      const cacheBuster = Date.now();
      const res = await fetch(`/api/squad?entryId=${encodeURIComponent(entryId)}${preset ? `&preset=${encodeURIComponent(preset)}` : ""}&_t=${cacheBuster}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load squad");
      set({ squad: data as Squad, loading: false, error: null, lastImport: { entryId, preset } });
      return { ok: true } as const;
    } catch (e: any) {
      const msg = e?.message || "Failed to initialize squad";
      set({ loading: false, error: msg });
      return { ok: false, error: msg } as const;
    }
  },

  refresh: async () => {
    const lastImport = get().lastImport;
    if (!lastImport) return { ok: false, error: "No previous import to refresh" };
    return get().initialize(lastImport);
  },

  counts: () => {
    const s = get().squad;
    const byPos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    const byClub: Record<string, number> = {};
    let total = 0;
    for (const p of flattenSquad(s)) {
      total++;
      byPos[p.position]++;
      byClub[p.team] = (byClub[p.team] ?? 0) + 1;
    }
    return { total, byClub, byPos };
  },

  addPlayer: (p) => {
    get().pushHistory(); // Save state before adding player
    const s = structuredClone(get().squad);
    // Already in squad
    if (flattenSquad(s).some(x => x.id === p.id)) return { ok: false, reason: "Player is already in your squad" };

    const { total, byClub, byPos } = get().counts();
    if (total >= MAX_SQUAD_SIZE) return { ok: false, reason: "Squad is full (15)" };
    if ((byPos[p.position] ?? 0) >= MAX_BY_POSITION[p.position]) return { ok: false, reason: `Max ${p.position} reached` };
    if ((byClub[p.team] ?? 0) >= MAX_PER_CLUB) return { ok: false, reason: `Max 3 from ${p.team}` };
    if (precision2(s.bank - p.price) < 0) return { ok: false, reason: "Not enough funds" };

    const sc = startersCounts(s);
    const bc = benchCounts(s);

    const canAddToStarters = sc.total < STARTERS_TOTAL && s.starters[p.position].length < STARTERS_MAX[p.position];
    const canAddToBench = s.bench.length < BENCH_SIZE
      && (p.position !== 'GK' ? true : (bc.byPos.GK < BENCH_GK_REQUIRED))
      && (p.position !== 'DEF' ? true : (bc.byPos.DEF < BENCH_DEF_MAX));

    if (canAddToStarters) {
      s.starters[p.position].push(p);
    } else if (canAddToBench) {
      s.bench.push(p);
    } else {
      return { ok: false, reason: "No space on pitch or bench for this position" };
    }

    s.bank = precision2(s.bank - p.price);
    set({ squad: s });
    return { ok: true };
  },

  addPlayerToBench: (p) => {
    const s = structuredClone(get().squad);
    // Already in squad
    if (flattenSquad(s).some(x => x.id === p.id)) return { ok: false, reason: "Player is already in your squad" };

    const { total, byClub, byPos } = get().counts();
    if (total >= MAX_SQUAD_SIZE) return { ok: false, reason: "Squad is full (15)" };
    if ((byPos[p.position] ?? 0) >= MAX_BY_POSITION[p.position]) return { ok: false, reason: `Max ${p.position} reached` };
    if ((byClub[p.team] ?? 0) >= MAX_PER_CLUB) return { ok: false, reason: `Max 3 from ${p.team}` };
    if (precision2(s.bank - p.price) < 0) return { ok: false, reason: "Not enough funds" };

    const bc = benchCounts(s);
    const canAddToBench = s.bench.length < BENCH_SIZE
      && (p.position !== 'GK' ? true : (bc.byPos.GK < BENCH_GK_REQUIRED))
      && (p.position !== 'DEF' ? true : (bc.byPos.DEF < BENCH_DEF_MAX));

    if (!canAddToBench) return { ok: false, reason: "No space on bench for this position" };

    s.bench.push(p);
    s.bank = precision2(s.bank - p.price);
    set({ squad: s });
    return { ok: true };
  },

  removePlayer: (id) => {
    get().pushHistory(); // Save state before removal
    const s = structuredClone(get().squad);
    const { area, index } = findPlayerIndex(s, id);
    if (!area) return;
    const p = area === "BENCH" ? s.bench[index] : s.starters[area][index];
    if (area === "BENCH") s.bench.splice(index, 1);
    else s.starters[area].splice(index, 1);
    s.bank = precision2(s.bank + p.price);
    if (s.captainId === id) s.captainId = undefined;
    if (s.viceId === id) s.viceId = undefined;
    set({ squad: s });
  },

  moveToBench: (id) => {
    const s = structuredClone(get().squad);
    const { area, index } = findPlayerIndex(s, id);
    if (!area) return { ok: false, reason: "Not found" };
    if (area === "BENCH") return { ok: false, reason: "Already on bench" };
    if (s.bench.length >= BENCH_SIZE) return { ok: false, reason: "Bench is full" };

    const p = s.starters[area][index];
    const sc = startersCounts(s);
    const bc = benchCounts(s);

    if (p.position === 'GK') return { ok: false, reason: "Must have exactly 1 GK playing" };
    if (p.position === 'DEF' && sc.byPos.DEF <= STARTERS_MIN.DEF) return { ok: false, reason: "You must play at least 3 defenders" };
    if (p.position === 'MID' && sc.byPos.MID <= STARTERS_MIN.MID) return { ok: false, reason: "You must play at least 3 midfielders" };
    if (p.position === 'FWD' && sc.byPos.FWD <= STARTERS_MIN.FWD) return { ok: false, reason: "You must play at least 1 forward" };

    if (p.position === 'DEF' && bc.byPos.DEF >= BENCH_DEF_MAX) return { ok: false, reason: "Max 2 defenders on bench" };

    s.starters[area].splice(index, 1);
    s.bench.push(p);
    set({ squad: s });
    return { ok: true };
  },

  // Prefer placeOnPitch with replaceIndex for swaps
  moveToPitch: (id, position) => get().placeOnPitch(id, position),

  placeOnPitch: (id, position, replaceIndex) => {
    const s = structuredClone(get().squad);
    const { area, index } = findPlayerIndex(s, id);
    if (!area) return { ok: false, reason: "Not found" };
    const p = area === "BENCH" ? s.bench[index] : s.starters[area][index];
    const isSwap = typeof replaceIndex === "number";

    if (area === "BENCH") {
      if (!isSwap) return { ok: false, reason: "Select a player on pitch to replace (drop onto a filled slot)" };
      const outgoing = s.starters[position][replaceIndex!];
      if (!outgoing) return { ok: false, reason: "Invalid target slot" };

      // Validate bench constraints
      const bc = benchCounts(s);
      const benchCheck = validateBenchAfterSwap(bc.byPos, p.position, outgoing.position);
      if (!benchCheck.valid) return { ok: false, reason: benchCheck.reason };

      // Validate formation after swap
      const sc = startersCounts(s);
      const nextFormation = getFormationAfterSwap(sc.byPos, position, p.position);
      const formationCheck = validateFormation(nextFormation);
      if (!formationCheck.valid) return { ok: false, reason: formationCheck.reason };

      // Apply swap
      if (p.position === position) {
        s.starters[position][replaceIndex!] = p;
      } else {
        s.starters[position].splice(replaceIndex!, 1);
        s.starters[p.position].push(p);
      }
      s.bench.splice(index, 1);
      s.bench.push(outgoing);
      set({ squad: s });
      return { ok: true };
    } else {
      // On-pitch -> on-pitch
      if (!isSwap) return { ok: false, reason: "Select a player on pitch to replace (drop onto a filled slot)" };
      const outgoing = s.starters[position][replaceIndex!];
      if (!outgoing) return { ok: false, reason: "Invalid target slot" };

      if (area === position) {
        // Same-row swap: swap indices within the row
        [s.starters[position][index], s.starters[position][replaceIndex!]] = 
          [s.starters[position][replaceIndex!], s.starters[position][index]];
        set({ squad: s });
        return { ok: true };
      }

      return { ok: false, reason: "Cross-position swaps on pitch are not supported. To change formation, drag a bench player onto a starter." };
    }
  },

  makeCaptain: (id) => {
    const s = structuredClone(get().squad);
    if (!flattenSquad(s).some(p => p.id === id)) return;
    s.captainId = id;
    // ensure captain != vice
    if (s.viceId === id) s.viceId = undefined;
    set({ squad: s });
  },

  makeVice: (id) => {
    const s = structuredClone(get().squad);
    if (!flattenSquad(s).some(p => p.id === id)) return;
    s.viceId = id;
    if (s.captainId === id) s.captainId = undefined;
    set({ squad: s });
  },

  setBank: (v) => set(state => ({ squad: { ...state.squad, bank: precision2(v) } })),

  selectPlayer: (id) => set({ selectedPlayerId: id }),

  swapPlayers: (targetId) => {
    get().pushHistory(); // Save state before swap
    const s = structuredClone(get().squad);
    const selectedId = get().selectedPlayerId;
    
    if (!selectedId) return { ok: false, reason: "No player selected" };
    if (selectedId === targetId) {
      set({ selectedPlayerId: null });
      return { ok: true };
    }

    const { area: area1, index: index1 } = findPlayerIndex(s, selectedId);
    const { area: area2, index: index2 } = findPlayerIndex(s, targetId);

    if (!area1 || !area2) return { ok: false, reason: "Player not found" };

    const p1 = area1 === "BENCH" ? s.bench[index1] : s.starters[area1][index1];
    const p2 = area2 === "BENCH" ? s.bench[index2] : s.starters[area2][index2];

    // Both on bench - simple swap
    if (area1 === "BENCH" && area2 === "BENCH") {
      [s.bench[index1], s.bench[index2]] = [s.bench[index2], s.bench[index1]];
      set({ squad: s, selectedPlayerId: null });
      return { ok: true };
    }

    // Both on pitch, same position - simple swap
    if (area1 !== "BENCH" && area2 !== "BENCH" && area1 === area2) {
      const row = s.starters[area1];
      [row[index1], row[index2]] = [row[index2], row[index1]];
      set({ squad: s, selectedPlayerId: null });
      return { ok: true };
    }

    // One on bench, one on pitch - swap with validation
    if ((area1 === "BENCH" && area2 !== "BENCH") || (area1 !== "BENCH" && area2 === "BENCH")) {
      const benchPlayer = area1 === "BENCH" ? p1 : p2;
      const pitchPlayer = area1 === "BENCH" ? p2 : p1;
      const pitchArea = (area1 === "BENCH" ? area2 : area1) as Position;
      const pitchIndex = area1 === "BENCH" ? index2 : index1;
      const benchIndex = area1 === "BENCH" ? index1 : index2;

      // Validate bench constraints
      const bc = benchCounts(s);
      const benchCheck = validateBenchAfterSwap(bc.byPos, benchPlayer.position, pitchPlayer.position);
      if (!benchCheck.valid) return { ok: false, reason: benchCheck.reason };

      // Validate formation after swap
      const sc = startersCounts(s);
      const nextFormation = getFormationAfterSwap(sc.byPos, pitchArea, benchPlayer.position);
      const formationCheck = validateFormation(nextFormation);
      if (!formationCheck.valid) return { ok: false, reason: formationCheck.reason };

      // Apply swap
      if (benchPlayer.position === pitchArea) {
        s.starters[pitchArea][pitchIndex] = benchPlayer;
      } else {
        s.starters[pitchArea].splice(pitchIndex, 1);
        s.starters[benchPlayer.position].push(benchPlayer);
      }
      s.bench.splice(benchIndex, 1);
      s.bench.push(pitchPlayer);
      set({ squad: s, selectedPlayerId: null });
      return { ok: true };
    }

    // Cross-position pitch swaps not allowed
    return { ok: false, reason: "Cannot swap players of different positions on the pitch. Swap with bench instead." };
  },

  // Replace the entire squad (used by FPL import)
  replaceSquad: (s) => set({ squad: s }),

  // Update player prices from a provided players list (id -> price)
  syncPrices: (players) => set((state) => {
    const priceMap: Record<string, number> = Object.fromEntries(players.map(p => [p.id, p.price]));
    const playerMap: Record<string, Player> = Object.fromEntries(players.map(p => [p.id, p]));
    const s = structuredClone(state.squad);
    const apply = (arr: Player[]) => arr.map(p => {
      const updated = playerMap[p.id];
      // Update all fields if player found, otherwise just update price
      return updated ? { ...updated } : { ...p, price: typeof priceMap[p.id] === 'number' ? priceMap[p.id] : p.price };
    });
    s.starters.GK = apply(s.starters.GK);
    s.starters.DEF = apply(s.starters.DEF);
    s.starters.MID = apply(s.starters.MID);
    s.starters.FWD = apply(s.starters.FWD);
    s.bench = apply(s.bench);
    return { squad: s };
  }),

  totalExpPoints: () => {
    const s = get().squad;
    const starters = getStarters(s);
    let total = starters.reduce((acc, p) => acc + (p.expPoints ?? 0), 0);
    // Captain double only if captain is a starter
    if (s.captainId) {
      const cap = starters.find(p => p.id === s.captainId);
      if (cap) total += cap.expPoints ?? 0;
    }
    return precision2(total);
  },

  // --- Week-aware projection selectors ---
  startersExpForWeek: (weekOffset: number) => {
    const starters = getStarters(get().squad);
    return precision2(starters.reduce((acc, p) => acc + weeklyExp(p, weekOffset), 0));
  },
  benchExpForWeek: (weekOffset: number) => {
    const s = get().squad;
    const sum = s.bench.reduce((acc, p) => acc + weeklyExp(p, weekOffset), 0);
    return precision2(sum);
  },
  totalExpForWeek: (weekOffset: number) => {
    const s = get().squad;
    const starters = getStarters(s);
    let total = starters.reduce((acc, p) => acc + weeklyExp(p, weekOffset), 0);
    if (s.captainId) {
      const cap = starters.find(p => p.id === s.captainId);
      if (cap) total += weeklyExp(cap, weekOffset);
    }
    return precision2(total);
  },
  totalExpWithBenchBoostForWeek: (weekOffset: number) => {
    const starters = get().totalExpForWeek(weekOffset);
    const bench = get().benchExpForWeek(weekOffset);
    return precision2(starters + bench);
  },

  teamRating: () => {
    // heuristic: compare exp points per slot, scaled for realistic ratings
    const perSlot = get().totalExpPoints() / 11;
    const rating = Math.min(100, Math.max(0, (perSlot / TEAM_RATING_BENCHMARK) * 100));
    return Math.round(rating);
  },

  gwRating: () => {
    const starters = getStarters(get().squad);
    if (starters.length === 0) return 0;
    const totalExp = starters.reduce((acc, p) => acc + (p.expPoints ?? 0), 0);
    const avgExpPerStarter = totalExp / starters.length;
    const rating = Math.min(100, Math.max(0, (avgExpPerStarter / GW_RATING_BENCHMARK) * 100));
    return Math.round(rating);
  },

  // Week-aware rating methods (use weeklyExp for accurate future gameweek ratings)
  teamRatingForWeek: (weekOffset: number) => {
    const perSlot = get().totalExpForWeek(weekOffset) / 11;
    const rating = Math.min(100, Math.max(0, (perSlot / TEAM_RATING_BENCHMARK) * 100));
    return Math.round(rating);
  },

  gwRatingForWeek: (weekOffset: number) => {
    const starters = getStarters(get().squad);
    if (starters.length === 0) return 0;
    const totalExp = starters.reduce((acc, p) => acc + weeklyExp(p, weekOffset), 0);
    const avgExpPerStarter = totalExp / starters.length;
    const rating = Math.min(100, Math.max(0, (avgExpPerStarter / GW_RATING_BENCHMARK) * 100));
    return Math.round(rating);
  },

  autoSelectBestXI: (weekOffset: number) => {
    get().pushHistory(); // Save state before auto-select
    const s = get().squad;
    const { xi, bench, capId } = pickXIForWeek(s, weekOffset);
    
    // Rebuild squad with optimal lineup
    const newStarters: Squad["starters"] = { GK: [], DEF: [], MID: [], FWD: [] };
    
    for (const p of xi) {
      newStarters[p.position].push(p);
    }
    
    set({
      squad: {
        ...s,
        starters: newStarters,
        bench,
        captainId: capId,
        // Keep vice or auto-select second best
        viceId: s.viceId && xi.find(p => p.id === s.viceId) ? s.viceId : (xi[1]?.id || undefined),
      }
    });
  },

}), { name: "fpl-copilot-squad-v2" }));
