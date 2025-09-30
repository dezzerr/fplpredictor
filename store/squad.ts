"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Player, Position, Squad } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";

export type SquadState = {
  squad: Squad;
  loading: boolean;
  error: string | null;
  lastImport: { entryId: string; preset?: string } | null;
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
  replaceSquad: (s: Squad) => void;
  syncPrices: (players: Player[]) => void;
  // selectors
  totalExpPoints: () => number;
  teamRating: () => number; // 0-100 simple heuristic
  gwRating: () => number; // 0-100 simple heuristic
  counts: () => { total: number; byClub: Record<string, number>; byPos: Record<Position, number> };
  // week-aware selectors (use weeklyExp)
  startersExpForWeek: (weekOffset: number) => number;
  benchExpForWeek: (weekOffset: number) => number;
  totalExpForWeek: (weekOffset: number) => number; // includes captain double if captain starts
  totalExpWithBenchBoostForWeek: (weekOffset: number) => number;
};

// Dynamic formation constraints
const STARTERS_MAX: Record<Position, number> = { GK: 1, DEF: 5, MID: 5, FWD: 3 };
const STARTERS_MIN: Record<Position, number> = { GK: 1, DEF: 3, MID: 3, FWD: 1 };
const STARTERS_TOTAL = 11;
const BENCH_SIZE = 4;
const BENCH_GK_REQUIRED = 1; // exactly 1 GK on bench
const BENCH_DEF_MAX = 2; // at most 2 DEF on bench

const MAX_PER_CLUB = 3;
const MAX_SQUAD = 15;
const MAX_BY_POS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function precision2(n: number) {
  return Math.round(n * 100) / 100;
}

function flattenSquad(s: Squad) {
  return [
    ...s.starters.GK,
    ...s.starters.DEF,
    ...s.starters.MID,
    ...s.starters.FWD,
    ...s.bench,
  ];
}

function startersCounts(s: Squad) {
  const byPos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  byPos.GK = s.starters.GK.length;
  byPos.DEF = s.starters.DEF.length;
  byPos.MID = s.starters.MID.length;
  byPos.FWD = s.starters.FWD.length;
  const total = byPos.GK + byPos.DEF + byPos.MID + byPos.FWD;
  return { total, byPos };
}

function benchCounts(s: Squad) {
  const byPos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of s.bench) byPos[p.position]++;
  return { total: s.bench.length, byPos };
}

function findPlayerIndex(s: Squad, id: string): { area: "GK"|"DEF"|"MID"|"FWD"|"BENCH"|null; index: number } {
  for (const pos of ["GK","DEF","MID","FWD"] as Position[]) {
    const idx = s.starters[pos].findIndex(p => p.id === id);
    if (idx !== -1) return { area: pos, index: idx } as any;
  }
  const bIdx = s.bench.findIndex(p => p.id === id);
  if (bIdx !== -1) return { area: "BENCH", index: bIdx } as any;
  return { area: null, index: -1 };
}

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
    const s = structuredClone(get().squad);
    // Already in squad
    if (flattenSquad(s).some(x => x.id === p.id)) return { ok: false, reason: "Player is already in your squad" };

    const { total, byClub, byPos } = get().counts();
    if (total >= MAX_SQUAD) return { ok: false, reason: "Squad is full (15)" };
    if ((byPos[p.position] ?? 0) >= MAX_BY_POS[p.position]) return { ok: false, reason: `Max ${p.position} reached` };
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
    if (total >= MAX_SQUAD) return { ok: false, reason: "Squad is full (15)" };
    if ((byPos[p.position] ?? 0) >= MAX_BY_POS[p.position]) return { ok: false, reason: `Max ${p.position} reached` };
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
    const bc = benchCounts(s);
    const isSwap = typeof replaceIndex === 'number';

    if (area === 'BENCH') {
      if (!isSwap) return { ok: false, reason: "Select a player on pitch to replace (drop onto a filled slot)" };
      const outgoing = s.starters[position][replaceIndex!];
      if (!outgoing) return { ok: false, reason: "Invalid target slot" };

      const nextBenchGK = bc.byPos.GK - (p.position === 'GK' ? 1 : 0) + (outgoing.position === 'GK' ? 1 : 0);
      if (nextBenchGK !== BENCH_GK_REQUIRED) return { ok: false, reason: "Bench must have exactly 1 GK" };
      const nextBenchDEF = bc.byPos.DEF - (p.position === 'DEF' ? 1 : 0) + (outgoing.position === 'DEF' ? 1 : 0);
      if (nextBenchDEF > BENCH_DEF_MAX) return { ok: false, reason: "Max 2 defenders on bench" };

      // Validate formation after swap (starters only)
      const sc = startersCounts(s);
      const nextStarters = { ...sc.byPos };
      if (position !== p.position) {
        nextStarters[position] -= 1;
        nextStarters[p.position] += 1;
      }
      // GK must be exactly 1 and within bounds
      if (nextStarters.GK < STARTERS_MIN.GK || nextStarters.GK > STARTERS_MAX.GK) {
        return { ok: false, reason: "Exactly 1 goalkeeper must start" };
      }
      // DEF/MID/FWD within min/max
      if (nextStarters.DEF < STARTERS_MIN.DEF || nextStarters.DEF > STARTERS_MAX.DEF) {
        return { ok: false, reason: "You must play between 3 and 5 defenders" };
      }
      if (nextStarters.MID < STARTERS_MIN.MID || nextStarters.MID > STARTERS_MAX.MID) {
        return { ok: false, reason: "You must play between 3 and 5 midfielders" };
      }
      if (nextStarters.FWD < STARTERS_MIN.FWD || nextStarters.FWD > STARTERS_MAX.FWD) {
        return { ok: false, reason: "You must play between 1 and 3 forwards" };
      }

      // Apply swap: if same position, replace in-place. If different position, remove outgoing and
      // add incoming to their own position row to adjust formation dynamically.
      if (p.position === position) {
        s.starters[position][replaceIndex!] = p;
      } else {
        s.starters[position].splice(replaceIndex!, 1); // remove outgoing from its row
        s.starters[p.position].push(p); // add incoming to their correct row
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
        const row = s.starters[position];
        const fromIdx = index;
        const toIdx = replaceIndex!;
        [row[fromIdx], row[toIdx]] = [row[toIdx], row[fromIdx]];
        set({ squad: s });
        return { ok: true };
      }

      // Disallow cross-position pitch swaps to preserve invariants.
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

  // Replace the entire squad (used by FPL import)
  replaceSquad: (s) => set({ squad: s }),

  // Update player prices from a provided players list (id -> price)
  syncPrices: (players) => set((state) => {
    const priceMap: Record<string, number> = Object.fromEntries(players.map(p => [p.id, p.price]));
    const s = structuredClone(state.squad);
    const apply = (arr: Player[]) => arr.map(p => ({ ...p, price: typeof priceMap[p.id] === 'number' ? priceMap[p.id] : p.price }));
    s.starters.GK = apply(s.starters.GK);
    s.starters.DEF = apply(s.starters.DEF);
    s.starters.MID = apply(s.starters.MID);
    s.starters.FWD = apply(s.starters.FWD);
    s.bench = apply(s.bench);
    return { squad: s };
  }),

  totalExpPoints: () => {
    const s = get().squad;
    const starters = [
      ...s.starters.GK,
      ...s.starters.DEF,
      ...s.starters.MID,
      ...s.starters.FWD,
    ];
    // Apply minutes probability to get realistic expected points
    let total = starters.reduce((acc, p) => {
      const adjustedPoints = (p.expPoints ?? 0) * (p.minutesProb ?? 0.8);
      return acc + adjustedPoints;
    }, 0);
    // Captain double only if captain is a starter (also apply minutesProb)
    if (s.captainId) {
      const cap = starters.find(p => p.id === s.captainId);
      if (cap) {
        const capBonus = (cap.expPoints ?? 0) * (cap.minutesProb ?? 0.8);
        total += capBonus;
      }
    }
    return precision2(total);
  },

  // --- Week-aware projection selectors ---
  startersExpForWeek: (weekOffset: number) => {
    const s = get().squad;
    const starters = [
      ...s.starters.GK,
      ...s.starters.DEF,
      ...s.starters.MID,
      ...s.starters.FWD,
    ];
    const sum = starters.reduce((acc, p) => acc + weeklyExp(p, weekOffset), 0);
    return precision2(sum);
  },
  benchExpForWeek: (weekOffset: number) => {
    const s = get().squad;
    const sum = s.bench.reduce((acc, p) => acc + weeklyExp(p, weekOffset), 0);
    return precision2(sum);
  },
  totalExpForWeek: (weekOffset: number) => {
    const s = get().squad;
    const starters = [
      ...s.starters.GK,
      ...s.starters.DEF,
      ...s.starters.MID,
      ...s.starters.FWD,
    ];
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
    // heuristic: compare exp points per slot (~5 avg) scale to 100
    const perSlot = get().totalExpPoints() / 11;
    return clamp(Math.round((perSlot / 6) * 100));
  },

  gwRating: () => {
    // heuristic: rate gameweek based on realistic expected points per starter
    const s = get().squad;
    const starters = [
      ...s.starters.GK,
      ...s.starters.DEF,
      ...s.starters.MID,
      ...s.starters.FWD,
    ];
    
    if (starters.length === 0) return 0;
    
    // Calculate average realistic expected points per starter (with minutesProb)
    const totalExp = starters.reduce((acc, p) => {
      const adjustedPoints = (p.expPoints ?? 0) * (p.minutesProb ?? 0.8);
      return acc + adjustedPoints;
    }, 0);
    const avgExpPerStarter = totalExp / starters.length;
    
    // Scale to percentage: assume 5+ points per starter is excellent (100%)
    // 3-5 points is good (60-100%), below 3 is poor (0-60%)
    const rating = Math.min(100, Math.max(0, (avgExpPerStarter / 5) * 100));
    return Math.round(rating);
  },

}), { name: "fpl-copilot-squad-v2" }));
