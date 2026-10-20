import { Player, Position, Squad, getFixturesForWeek } from "@/lib/data";

export type Transfer = { outId: string; inPlayer: Player };
export type Plan = { transfers: Transfer[]; weeks: number; hitCost: number };
export type PlanResult = Plan & {
  baseline: number;
  projected: number;
  netGain: number;
  weeklyCaptainIds: string[];
};

export type ChipRecommendation = {
  type: "TC" | "BB" | "FH" | "WC";
  week: number; // 0-indexed offset from current GW
  evGain: number;
  notes?: string;
  confidence?: "high" | "medium" | "low";
  score?: number;
  reason?: string;
};

// --- Utilities ---
function precision1(n: number) {
  return Math.round(n * 10) / 10;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const nonNeg = (n: number) => (isFinite(n) ? Math.max(0, n) : 0);
const boundedScore = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function chipConfidence(type: ChipRecommendation["type"], gain: number): "high" | "medium" | "low" {
  if (type === "TC") return gain >= 10 ? "high" : gain >= 7 ? "medium" : "low";
  if (type === "BB") return gain >= 16 ? "high" : gain >= 10 ? "medium" : "low";
  if (type === "FH") return gain >= 8 ? "high" : gain >= 4 ? "medium" : "low";
  return gain >= 6 ? "high" : gain >= 3 ? "medium" : "low";
}

function chipScore(type: ChipRecommendation["type"], gain: number): number {
  const benchmark = type === "TC" ? 12 : type === "BB" ? 18 : type === "FH" ? 10 : 8;
  return boundedScore((gain / benchmark) * 100);
}

function flattenSquad(s: Squad): Player[] {
  return [
    ...s.starters.GK,
    ...s.starters.DEF,
    ...s.starters.MID,
    ...s.starters.FWD,
    ...s.bench,
  ];
}

function countByClub(players: Player[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of players) map[p.team] = (map[p.team] ?? 0) + 1;
  return map;
}

const MAX_PER_CLUB = 3;
const MAX_BY_POS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };

function validateSquadCounts(players: Player[]): boolean {
  const byPos: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const byClub = countByClub(players);
  for (const p of players) byPos[p.position]++;
  if (byPos.GK > MAX_BY_POS.GK || byPos.DEF > MAX_BY_POS.DEF || byPos.MID > MAX_BY_POS.MID || byPos.FWD > MAX_BY_POS.FWD) return false;
  for (const club of Object.keys(byClub)) if (byClub[club] > MAX_PER_CLUB) return false;
  return true;
}

// --- Projection ---
export function weeklyExp(p: Player, weekOffset: number): number {
  // Guard against undefined or unavailable players
  if (!p) return 0;
  if (p.status === 'out') return 0;

  // Prefer explainability data for precise per-week factor
  if (p.expExplain) {
    // If market model provided per-event EPs, use them directly when available
    if (Array.isArray(p.expExplain.eventEP)) {
      const val = p.expExplain.eventEP[weekOffset];
      if (typeof val === 'number' && isFinite(val)) {
        return precision1(nonNeg(val));
      }
    }
    // For week 0, use the calibrated next-GW EP directly (already accounts for form, penalties, etc)
    if (weekOffset === 0 && typeof p.expPoints === 'number') {
      // Don't re-apply minutesProb - it's already factored into expPoints calculation
      return precision1(nonNeg(p.expPoints));
    }
    const ex = p.expExplain;
    const base = nonNeg(ex.base);
    const formF = nonNeg(ex.formFactor);
    const posF = nonNeg(ex.positionFactor);
    const penaltyBoost = typeof ex.penaltyBoost === 'number' ? nonNeg(ex.penaltyBoost) : 1;
    const cal = typeof ex.calibration === 'number' ? nonNeg(ex.calibration) : 1;

    // A usage-v2 cameo can have zero chance of 60+ while still appearing and
    // scoring points. Only zero appearance probability means no projection.
    if (ex.playingTime) {
      if (clamp01(ex.playingTime.appearanceProbability) === 0) return 0;
    } else if (typeof ex.minutesProb === 'number' && clamp01(ex.minutesProb) === 0) {
      return 0;
    }

    // Anchor to week-0 points to preserve global calibration (CAL) and DGW accounting
    const ef0 = (typeof ex.nextWeekFactor === 'number'
      ? ex.nextWeekFactor
      : (Array.isArray(ex.eventFactors) && typeof ex.eventFactors[0] === 'number')
        ? ex.eventFactors[0]
        : (ex.fixtureWeights?.[0]?.factor ?? 1));
    const c0 = (typeof ex.nextEventFixtureCount === 'number'
      ? ex.nextEventFixtureCount
      : (Array.isArray(ex.eventFixtureCounts) && typeof ex.eventFixtureCounts[0] === 'number')
        ? ex.eventFixtureCounts[0]
        : 1);
    const anchorPts = typeof p.expPoints === 'number'
      ? nonNeg(p.expPoints)
      : precision1(nonNeg(base * posF * cal * formF * penaltyBoost * nonNeg(ef0) * Math.max(1, c0)));

    // Compute effective factor for requested week (DGW/blank aware) with decay beyond horizon
    const getEff = (idx: number): { f: number; c: number } => {
      let f: number | undefined = Array.isArray(ex.eventFactors) ? ex.eventFactors[idx] : undefined;
      const lastIdx = Array.isArray(ex.eventFactors) ? ex.eventFactors.length - 1 : -1;
      if (typeof f !== 'number' && lastIdx >= 0 && idx > lastIdx) {
        const last = ex.eventFactors![lastIdx];
        const steps = idx - lastIdx;
        if (typeof last === 'number' && steps > 0) f = last * Math.pow(0.9, steps);
      }
      let c = Array.isArray(ex.eventFixtureCounts) && typeof ex.eventFixtureCounts[idx] === 'number'
        ? ex.eventFixtureCounts[idx]!
        : 1;
      if (typeof f !== 'number') {
        // Fall back to fixtureWeights
        const fw = ex.fixtureWeights?.[idx];
        if (fw) f = fw.factor;
        else if (ex.fixtureWeights && ex.fixtureWeights.length) {
          const li = ex.fixtureWeights.length - 1;
          const last = ex.fixtureWeights[li].factor;
          const steps = idx - li;
          f = last * (steps > 0 ? Math.pow(0.9, steps) : 1);
        } else {
          f = 1;
        }
      }
      // Minimum 1 fixture if counts unknown; preserve blanks when 0 is explicitly known
      c = Math.max(0, c);
      if (!Array.isArray(ex.eventFixtureCounts)) c = Math.max(1, c);
      return { f: nonNeg(f!), c };
    };

    const eff0 = { f: nonNeg(ef0), c: Math.max(1, c0) };
    const effW = getEff(weekOffset);
    const denom = eff0.f * eff0.c;
    if (denom > 0) {
      const ratio = (effW.f * effW.c) / denom;
      return precision1(nonNeg(anchorPts * ratio));
    }

    // Final fallback: compute directly (still multiply by fixture count when available)
    const val = base * posF * cal * formF * penaltyBoost * effW.f * Math.max(1, effW.c);
    return precision1(nonNeg(val));
  }

  // Fallback using realistic expected points and fixture difficulty scaling, if available
  const base = typeof p.expPoints === 'number'
    ? nonNeg(p.playingTime ? p.expPoints : p.expPoints * (p.minutesProb ?? 0.8))
    : 0;
  const currentF = p.nextFixtures?.[0];
  const targetF = p.nextFixtures?.[weekOffset];
  const factor = (f: any) => {
    if (!f) return 1;
    const d = f.diff ?? 3;
    const isHome = !!f.H;
    const diffFactor = 1 + 0.1 * (3 - d) / 2; // ~0.9..1.1
    const homeFactor = isHome ? 1.06 : 0.96;
    return nonNeg(diffFactor * homeFactor);
  };
  const f0 = factor(currentF);
  const fw = factor(targetF);
  const scaled = f0 > 0 ? base * (fw / f0) : base;
  return precision1(nonNeg(scaled));
}

export function pickXIForWeek(s: Squad, weekOffset: number): { xi: Player[]; bench: Player[]; capId: string; points: number } {
  const all = flattenSquad(s);
  const gks = all.filter(p => p.position === 'GK').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  const defs = all.filter(p => p.position === 'DEF').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  const mids = all.filter(p => p.position === 'MID').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  const fwds = all.filter(p => p.position === 'FWD').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));

  const xi: Player[] = [];
  const pushTop = (arr: Player[], n: number) => { for (let i=0;i<n && i<arr.length;i++) xi.push(arr[i]); };
  // minima
  pushTop(gks, 1);
  pushTop(defs, 3);
  pushTop(mids, 3);
  pushTop(fwds, 1);
  // fill remaining 11 - current
  const counts = { GK: xi.filter(p=>p.position==='GK').length, DEF: xi.filter(p=>p.position==='DEF').length, MID: xi.filter(p=>p.position==='MID').length, FWD: xi.filter(p=>p.position==='FWD').length };
  const maxByPos = { GK: 1, DEF: 5, MID: 5, FWD: 3 } as const;
  const candidates = [
    ...defs.slice(counts.DEF),
    ...mids.slice(counts.MID),
    ...fwds.slice(counts.FWD),
  ].sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  while (xi.length < 11 && candidates.length) {
    const p = candidates.shift()!;
    const c = counts[p.position as keyof typeof counts] as number;
    const mx = maxByPos[p.position as keyof typeof maxByPos] as number;
    if (c < mx) {
      xi.push(p);
      (counts as any)[p.position] = c + 1;
    }
  }
  // bench are the rest
  const xiIds = new Set(xi.map(p=>p.id));
  const bench = all.filter(p => !xiIds.has(p.id));

  // captain = max points in xi
  let cap = xi[0];
  let capPts = cap ? weeklyExp(cap, weekOffset) : 0;
  for (const p of xi) {
    const pts = weeklyExp(p, weekOffset);
    if (pts > capPts) { cap = p; capPts = pts; }
  }

  const points = precision1(xi.reduce((s,p)=> s + weeklyExp(p, weekOffset), 0) + capPts); // add extra for captain
  return { xi, bench, capId: cap ? cap.id : "", points };
}

// Build best XI from a candidate pool for a target week, obeying 3-per-club and formation bounds
export function pickBestXIFromPool(pool: Player[], weekOffset: number): { xi: Player[]; capId: string; points: number } {
  const availablePool = pool.filter((p) => getFixturesForWeek(p, weekOffset).length > 0);
  const gks = availablePool.filter(p => p.position === 'GK').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  const defs = availablePool.filter(p => p.position === 'DEF').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  const mids = availablePool.filter(p => p.position === 'MID').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  const fwds = availablePool.filter(p => p.position === 'FWD').sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));

  const xi: Player[] = [];
  const clubCount: Record<string, number> = {};
  const incClub = (team: string) => { clubCount[team] = (clubCount[team] ?? 0) + 1; };
  const canAdd = (p: Player, posCounts: Record<Position, number>, maxByPos: Record<Position, number>) => {
    if ((clubCount[p.team] ?? 0) >= MAX_PER_CLUB) return false;
    const curr = posCounts[p.position];
    const mx = maxByPos[p.position];
    return curr < mx;
  };

  const posCounts: Record<Position, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const maxByPos: Record<Position, number> = { GK: 1, DEF: 5, MID: 5, FWD: 3 };

  // GK: choose top feasible
  for (const p of gks) { if (canAdd(p, posCounts, maxByPos)) { xi.push(p); posCounts.GK++; incClub(p.team); break; } }

  // Minimums: DEF 3, MID 3, FWD 1
  const pushMin = (arr: Player[], need: number, key: Position) => {
    for (const p of arr) {
      if (xi.length >= 11) break;
      if (posCounts[key] >= need) break;
      if (!canAdd(p, posCounts, maxByPos)) continue;
      xi.push(p); posCounts[key]++; incClub(p.team);
    }
  };
  pushMin(defs, 3, 'DEF');
  pushMin(mids, 3, 'MID');
  pushMin(fwds, 1, 'FWD');

  // Remaining spots: best available across DEF/MID/FWD obeying limits
  const used = new Set(xi.map(p=>p.id));
  const rest = [
    ...defs.filter(p=>!used.has(p.id)),
    ...mids.filter(p=>!used.has(p.id)),
    ...fwds.filter(p=>!used.has(p.id)),
  ].sort((a,b)=> weeklyExp(b, weekOffset) - weeklyExp(a, weekOffset));
  for (const p of rest) {
    if (xi.length >= 11) break;
    if (!canAdd(p, posCounts, maxByPos)) continue;
    xi.push(p); (posCounts as any)[p.position]++; incClub(p.team);
  }

  // Compute captain and total points consistent with pickXIForWeek
  let cap = xi[0];
  let capPts = cap ? weeklyExp(cap, weekOffset) : 0;
  for (const p of xi) {
    const pts = weeklyExp(p, weekOffset);
    if (pts > capPts) { cap = p; capPts = pts; }
  }
  const points = precision1(xi.reduce((s,p)=> s + weeklyExp(p, weekOffset), 0) + capPts);
  return { xi, capId: cap ? cap.id : "", points };
}

export function totalHorizonPoints(s: Squad, weeks: number): { total: number; captainIds: string[] } {
  let total = 0;
  const caps: string[] = [];
  for (let w=0; w<weeks; w++) {
    const { points, capId } = pickXIForWeek(s, w);
    total += points;
    caps.push(capId);
  }
  return { total: precision1(total), captainIds: caps };
}

// --- Transfer evaluation ---

function replacePlayerInSquad(s: Squad, outId: string, inPlayer: Player): Squad {
  const ns: Squad = JSON.parse(JSON.stringify(s));
  const replaceIn = (arr: Player[]) => {
    const i = arr.findIndex(p => p.id === outId);
    if (i !== -1) arr[i] = inPlayer;
    return i !== -1;
  };
  if (replaceIn(ns.starters.GK)) return ns;
  if (replaceIn(ns.starters.DEF)) return ns;
  if (replaceIn(ns.starters.MID)) return ns;
  if (replaceIn(ns.starters.FWD)) return ns;
  if (replaceIn(ns.bench)) return ns;
  return ns;
}

function computeBankAfter(s: Squad, outIds: string[], inPlayers: Player[]): number {
  const outSum = flattenSquad(s).filter(p => outIds.includes(p.id)).reduce((x,p)=> x + p.price, 0);
  const inSum = inPlayers.reduce((x,p)=> x + p.price, 0);
  return Math.round((s.bank + outSum - inSum) * 100) / 100;
}

function isValidAfter(s: Squad, outIds: string[], inPlayers: Player[]): boolean {
  const temp: Player[] = flattenSquad(s).map(p => outIds.includes(p.id) ? null as any : p).filter(Boolean) as Player[];
  for (const p of inPlayers) temp.push(p);
  if (!validateSquadCounts(temp)) return false;
  return true;
}

/**
 * Select a useful spread of transfer plans for presentation.
 *
 * Pure net-gain sorting is mathematically valid but can surface several
 * alternatives for the same weak player, hiding other viable routes through
 * the squad. Take the best plan for each distinct outgoing player first, then
 * fill any remaining slots by net gain. The optimizer still evaluates every
 * candidate; this only controls how recommendations are presented.
 */
export function selectDiverseTransferPlans(
  plans: PlanResult[],
  limit: number,
  maxPerOutgoing = 1,
): PlanResult[] {
  if (limit <= 0) return [];

  const sorted = [...plans].sort((a, b) => b.netGain - a.netGain);
  const selected: PlanResult[] = [];
  const outgoingCounts = new Map<string, number>();

  const canSelect = (plan: PlanResult) => {
    if (plan.transfers.length === 0) return selected.length === 0;
    return plan.transfers.every((transfer) =>
      (outgoingCounts.get(transfer.outId) ?? 0) < maxPerOutgoing,
    );
  };

  const add = (plan: PlanResult) => {
    selected.push(plan);
    for (const transfer of plan.transfers) {
      outgoingCounts.set(transfer.outId, (outgoingCounts.get(transfer.outId) ?? 0) + 1);
    }
  };

  // First pass: maximize outgoing-player variety.
  for (const plan of sorted) {
    if (selected.length >= limit) break;
    if (canSelect(plan)) add(plan);
  }

  // Second pass: fill the requested number with the strongest remaining
  // plans, including additional alternatives for already represented players.
  for (const plan of sorted) {
    if (selected.length >= limit) break;
    if (!selected.includes(plan)) add(plan);
  }

  return selected;
}

export function recommendTransfers(params: {
  squad: Squad;
  players: Player[];
  weeks: number;
  allowedFreeTransfers?: number; // default 1
  hitCostPerExtra?: number; // default 4
  maxTransfersToConsider?: number; // default 2
  perPosCandidateLimit?: number; // default 20
}): PlanResult[] {
  const {
    squad,
    players,
    weeks,
    allowedFreeTransfers = 1,
    hitCostPerExtra = 4,
    maxTransfersToConsider = 2,
    perPosCandidateLimit = 20,
  } = params;

  const currPlayers = flattenSquad(squad);
  const inSquad = new Set(currPlayers.map(p => p.id));
  const poolByPos: Record<Position, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of players) if (!inSquad.has(p.id)) poolByPos[p.position].push(p);

  // Rank candidates per position by 3-week projected points (rough proxy)
  const proxyWeeks = Math.max(1, Math.min(weeks, 3));
  const projectSum = (p: Player) => {
    let s = 0; for (let i=0;i<proxyWeeks;i++) s += weeklyExp(p, i); return s;
  };
  for (const pos of ["GK","DEF","MID","FWD"] as Position[]) {
    poolByPos[pos].sort((a,b)=> projectSum(b) - projectSum(a));
    poolByPos[pos] = poolByPos[pos].slice(0, perPosCandidateLimit);
  }

  const baseline = totalHorizonPoints(squad, weeks);
  const plans: PlanResult[] = [];

  // 0-transfer plan (for reference)
  plans.push({ transfers: [], weeks, hitCost: 0, baseline: baseline.total, projected: baseline.total, netGain: 0, weeklyCaptainIds: baseline.captainIds });

  // 1-transfer plans (same-position only)
  for (const out of currPlayers) {
    const candidates = poolByPos[out.position];
    for (const inP of candidates) {
      const newBank = computeBankAfter(squad, [out.id], [inP]);
      if (newBank < 0) continue;
      if (!isValidAfter(squad, [out.id], [inP])) continue;
      let next = replacePlayerInSquad(squad, out.id, inP);
      next = { ...next, bank: newBank };
      const { total, captainIds } = totalHorizonPoints(next, weeks);
      const hit = Math.max(0, 1 - allowedFreeTransfers) * hitCostPerExtra;
      const net = precision1(total - baseline.total - hit);
      plans.push({ transfers: [{ outId: out.id, inPlayer: inP }], weeks, hitCost: hit, baseline: baseline.total, projected: total, netGain: net, weeklyCaptainIds: captainIds });
    }
  }

  if (maxTransfersToConsider >= 2) {
    // 2-transfer plans (same-position pairs)
    for (let i=0; i<currPlayers.length; i++) {
      const outA = currPlayers[i];
      for (let j=i+1; j<currPlayers.length; j++) {
        const outB = currPlayers[j];
        const candA = poolByPos[outA.position];
        const candB = poolByPos[outB.position];
        for (const inA of candA) {
          for (const inB of candB) {
            // avoid duplicates and re-adding existing
            if (inA.id === outB.id || inB.id === outA.id || inA.id === inB.id) continue;
            const newBank = computeBankAfter(squad, [outA.id, outB.id], [inA, inB]);
            if (newBank < 0) continue;
            if (!isValidAfter(squad, [outA.id, outB.id], [inA, inB])) continue;
            let next = replacePlayerInSquad(squad, outA.id, inA);
            next = replacePlayerInSquad(next, outB.id, inB);
            next = { ...next, bank: newBank };
            const { total, captainIds } = totalHorizonPoints(next, weeks);
            const extra = Math.max(0, 2 - allowedFreeTransfers);
            const hit = extra * hitCostPerExtra;
            const net = precision1(total - baseline.total - hit);
            plans.push({ transfers: [{ outId: outA.id, inPlayer: inA }, { outId: outB.id, inPlayer: inB }], weeks, hitCost: hit, baseline: baseline.total, projected: total, netGain: net, weeklyCaptainIds: captainIds });
          }
        }
      }
    }
  }

  // Keep a wider ranked pool so presentation layers can diversify outgoing
  // players before trimming to the number shown to managers.
  plans.sort((a,b)=> b.netGain - a.netGain);
  return plans.slice(0, 100);
}

export function recommendChips(s: Squad, weeks: number, players?: Player[]): ChipRecommendation[] {
  const recs: ChipRecommendation[] = [];
  // Triple Captain: choose week with max captain points
  let bestTc = { week: 0, gain: 0 };
  for (let w=0; w<weeks; w++) {
    const { xi } = pickXIForWeek(s, w);
    let best = 0;
    for (const p of xi) best = Math.max(best, weeklyExp(p, w));
    if (best > bestTc.gain) bestTc = { week: w, gain: best };
  }
  // Add TC note with DGW/blank counts among starters if available
  {
    const { xi } = pickXIForWeek(s, bestTc.week);
    const counts = xi.map(p => p.expExplain?.eventFixtureCounts?.[bestTc.week]).filter((n): n is number => typeof n === 'number');
    const dgw = counts.filter(c => c >= 2).length;
    const blanks = counts.filter(c => c === 0).length;
    const noteExtra = counts.length ? ` • Starters: ${dgw} DGW, ${blanks} blanks` : "";
    const gain = precision1(bestTc.gain);
    const cap = xi.find(p => precision1(weeklyExp(p, bestTc.week)) === gain);
    const reason = cap ? `${cap.name} is the best captain projection at ${gain.toFixed(1)} points.` : `Best captain projection is ${gain.toFixed(1)} points.`;
    recs.push({ type: "TC", week: bestTc.week, evGain: gain, confidence: chipConfidence("TC", gain), score: chipScore("TC", gain), reason, notes: `${reason} Extra points equal to chosen captain's GW score (beyond normal double).${noteExtra}` });
  }

  // Bench Boost: week with max bench points, add DGW/blank context
  let bestBb = { week: 0, gain: 0 };
  for (let w=0; w<weeks; w++) {
    const { bench } = pickXIForWeek(s, w);
    const benchPts = bench.reduce((s2,p)=> s2 + weeklyExp(p, w), 0);
    if (benchPts > bestBb.gain) bestBb = { week: w, gain: benchPts };
  }
  {
    const { bench } = pickXIForWeek(s, bestBb.week);
    const counts = bench.map(p => p.expExplain?.eventFixtureCounts?.[bestBb.week]).filter((n): n is number => typeof n === 'number');
    const dgw = counts.filter(c => c >= 2).length;
    const blanks = counts.filter(c => c === 0).length;
    const noteExtra = counts.length ? ` • Bench: ${dgw} DGW, ${blanks} blanks` : "";
    const gain = precision1(bestBb.gain);
    const reason = `Bench projects ${gain.toFixed(1)} extra points.`;
    recs.push({ type: "BB", week: bestBb.week, evGain: gain, confidence: chipConfidence("BB", gain), score: chipScore("BB", gain), reason, notes: `${reason} Sum of bench points added in that GW.${noteExtra}` });
  }

  // Free Hit: build best XI from full player pool for each week; choose max delta vs baseline XI
  if (Array.isArray(players) && players.length) {
    let bestFh = { week: 0, gain: -Infinity };
    for (let w=0; w<weeks; w++) {
      const base = pickXIForWeek(s, w).points;
      const fh = pickBestXIFromPool(players, w).points;
      const delta = precision1(fh - base);
      if (delta > bestFh.gain) bestFh = { week: w, gain: delta };
    }
    if (bestFh.gain > 0) {
      // Provide FH context: DGW/blank counts in the FH XI
      const fhXi = pickBestXIFromPool(players, bestFh.week).xi;
      const counts = fhXi.map(p => p.expExplain?.eventFixtureCounts?.[bestFh.week]).filter((n): n is number => typeof n === 'number');
      const dgw = counts.filter(c => c >= 2).length;
      const blanks = counts.filter(c => c === 0).length;
      const noteExtra = counts.length ? ` • FH XI: ${dgw} DGW, ${blanks} blanks` : "";
      const gain = precision1(bestFh.gain);
      const reason = `Free Hit best XI is ${gain.toFixed(1)} points above current squad XI.`;
      recs.push({ type: "FH", week: bestFh.week, evGain: gain, confidence: chipConfidence("FH", gain), score: chipScore("FH", gain), reason, notes: `${reason} Best-XI vs current XI for that GW.${noteExtra}` });
    } else {
      recs.push({ type: "FH", week: 0, evGain: 0, confidence: "low", score: 0, reason: "No positive Free Hit edge found.", notes: "FH not clearly +EV over the horizon given current pool." });
    }
  } else {
    recs.push({ type: "FH", week: 0, evGain: 0, confidence: "low", score: 0, reason: "Full player pool unavailable.", notes: "Provide players[] to compute FH EV from full pool." });
  }

  // FH/WC placeholders: require heavier optimization across budget + transfers; provide indicative hooks
  const squadPlayers = flattenSquad(s);
  let bestWc = { week: 0, gain: 0 };
  for (let w=0; w<weeks; w++) {
    const selected = pickXIForWeek(s, w);
    const lowProjected = squadPlayers.filter(p => weeklyExp(p, w) < (p.position === "GK" || p.position === "DEF" ? 3 : 4)).length;
    const unavailable = squadPlayers.filter(p => p.status === "out" || getFixturesForWeek(p, w).length === 0).length;
    const minutesRisk = squadPlayers.filter(p =>
      (p.playingTime?.sixtyMinuteProbability ?? p.minutesProb ?? 0.8) < 0.65
    ).length;
    const topThreeReliance = selected.xi
      .map(p => weeklyExp(p, w))
      .sort((a,b)=> b - a)
      .slice(0, 3)
      .reduce((sum, pts)=> sum + pts, 0);
    const concentrationPenalty = Math.max(0, topThreeReliance - selected.points * 0.42) * 0.25;
    const weakness = lowProjected * 0.7 + unavailable * 1.6 + minutesRisk * 1.1 + concentrationPenalty;
    if (weakness > bestWc.gain) bestWc = { week: w, gain: precision1(weakness) };
  }
  const wcReason = bestWc.gain > 0
    ? `Squad weakness score peaks at ${bestWc.gain.toFixed(1)}.`
    : "No major squad weakness trigger found.";
  recs.push({ type: "WC", week: bestWc.week, evGain: bestWc.gain, confidence: chipConfidence("WC", bestWc.gain), score: chipScore("WC", bestWc.gain), reason: wcReason, notes: bestWc.gain >= 3 ? `${wcReason} Indicative wildcard trigger based on weak projections, blanks, and minutes risk.` : "Hold wildcard; no strong rebuild trigger over this horizon." });

  return recs;
}

// --- Plan simulation (apply user plans across horizon) ---

export type UserPlannedTransfer = { outId?: string; inId?: string };
export type UserPlanWeek = {
  weekOffset: number;
  transfers: UserPlannedTransfer[];
  chip?: "FH" | "BB" | "TC" | "WC";
  bank?: number;
};
export type PlanWeekMap = Record<number, UserPlanWeek>;
export type PlanWeekSummary = { week: number; capId: string; points: number; chip?: "FH"|"BB"|"TC"|"WC"; xiIds: string[] };

export function simulatePlannedHorizon(params: {
  squad: Squad;
  players: Player[];
  weeks: number;
  plans?: PlanWeekMap;
}): { perWeek: PlanWeekSummary[]; total: number; captainIds: string[] } {
  const { squad, players, weeks, plans } = params;
  const playersById = new Map<string, Player>();
  for (const p of players) playersById.set(p.id, p);
  // Include current squad players to ensure lookups succeed for legacy ids
  for (const p of flattenSquad(squad)) if (!playersById.has(p.id)) playersById.set(p.id, p);

  let current: Squad = JSON.parse(JSON.stringify(squad));
  const perWeek: PlanWeekSummary[] = [];
  const captainIds: string[] = [];
  let total = 0;

  for (let w = 0; w < weeks; w++) {
    const plan = plans?.[w];

    // Free Hit: override with best XI from full pool for this GW; no persistent changes
    if (plan?.chip === "FH") {
      const best = pickBestXIFromPool(players, w);
      total = precision1(total + best.points);
      perWeek.push({ week: w, capId: best.capId, points: best.points, chip: "FH", xiIds: best.xi.map(p=>p.id) });
      captainIds.push(best.capId);
      continue;
    }

    // Apply transfers (if any) and update bank
    let next = JSON.parse(JSON.stringify(current)) as Squad;
    const outIds: string[] = [];
    const inPlayers: Player[] = [];
    if (plan?.transfers?.length) {
      for (const t of plan.transfers) {
        if (!t.outId || !t.inId) continue;
        const inP = playersById.get(t.inId);
        if (!inP) continue;
        // Track and replace
        outIds.push(t.outId);
        inPlayers.push(inP);
        next = replacePlayerInSquad(next, t.outId, inP);
      }
      // Validate resulting counts; if invalid, revert transfers for this week
      if (!isValidAfter(current, outIds, inPlayers)) {
        next = JSON.parse(JSON.stringify(current));
        outIds.length = 0;
        inPlayers.length = 0;
      }
    }
    // Update bank either by computed delta or user override
    if (outIds.length || inPlayers.length) {
      const newBank = computeBankAfter(current, outIds, inPlayers);
      next = { ...next, bank: typeof plan?.bank === 'number' ? plan!.bank! : newBank };
    } else if (typeof plan?.bank === 'number') {
      next = { ...next, bank: plan.bank };
    }

    // Pick XI and compute points for this week
    const sel = pickXIForWeek(next, w);
    let pts = sel.points;
    // Apply chip effects (BB/TC). WC has no direct points effect.
    if (plan?.chip === "BB") {
      const benchPts = sel.bench.reduce((s, p) => s + weeklyExp(p, w), 0);
      pts = precision1(pts + benchPts);
    } else if (plan?.chip === "TC") {
      const cap = sel.capId ? sel.xi.find(p => p.id === sel.capId) : undefined;
      const capPts = cap ? weeklyExp(cap, w) : 0;
      pts = precision1(pts + capPts);
    }

    total = precision1(total + pts);
    perWeek.push({ week: w, capId: sel.capId, points: pts, chip: plan?.chip, xiIds: sel.xi.map(p=>p.id) });
    captainIds.push(sel.capId);

    // Persist changes (FH does not persist; others do)
    current = next;
  }

  return { perWeek, total: precision1(total), captainIds };
}
