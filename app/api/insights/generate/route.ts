import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai';
import { fetchPlayersWithMarket } from '@/lib/market';
import { extractGeminiResponseText, parseGeminiJsonArray } from '@/lib/ai/parseGeminiResponse';
import type { Player, Position } from '@/lib/data';

export const dynamic = 'force-dynamic';

const GEMINI_TIMEOUT_MS = 5000;

type InsightSentiment = 'positive' | 'negative' | 'neutral';

type InputFixture = {
  opp?: string;
  H?: boolean;
  diff?: number;
};

type InputPlayer = {
  id?: string;
  name?: string;
  team?: string;
  position?: Position;
  price?: number;
  form?: number;
  expPoints?: number;
  minutesProb?: number;
  ownership?: number;
  status?: 'fit' | 'flag' | 'out';
  fixtures?: InputFixture[];
  priceChangeEvent?: number;
  transfersInEvent?: number;
  transfersOutEvent?: number;
};

type Insight = {
  type: string;
  playerName: string;
  team: string;
  title: string;
  detail: string;
  sentiment: InsightSentiment;
  expectedGain?: number;
  confidence?: 'high' | 'medium' | 'low';
  source?: 'model' | 'gemini';
  transferOut?: string;
  transferIn?: string;
};

type ChipCode = 'TC' | 'BB' | 'FH' | 'WC';

type ChipUsage = {
  usedCounts: Record<ChipCode, number>;
  available: ChipCode[];
  playedThisGw: ChipCode | null;
};

const CHIP_ORDER: ChipCode[] = ['TC', 'BB', 'FH', 'WC'];

const CHIP_LABEL: Record<ChipCode, string> = {
  TC: 'Triple Captain',
  BB: 'Bench Boost',
  FH: 'Free Hit',
  WC: 'Wildcard',
};

const PROMPT = `You are an elite Fantasy Premier League analyst.
Generate EXTRA actionable insights (2 to 4) that complement an existing deterministic baseline.

Return JSON only in this exact shape: {"insights":[...]}.

Each insight object must include:
- type: one of "form_hot", "form_cold", "fixture_easy", "fixture_hard", "rotation_risk", "differential", "value_pick", "price_watch", "chip_advice"
- playerName
- team
- title (max 10 words)
- detail (1-2 concrete sentences, include useful numbers where possible)
- sentiment: "positive" | "negative" | "neutral"

Do not repeat transfer, captain, or chip tips already in baseline.
Do not include markdown or commentary outside JSON.`;

const INSIGHT_ITEM_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    type: { type: SchemaType.STRING },
    playerName: { type: SchemaType.STRING },
    team: { type: SchemaType.STRING },
    title: { type: SchemaType.STRING },
    detail: { type: SchemaType.STRING },
    sentiment: { type: SchemaType.STRING },
    expectedGain: { type: SchemaType.NUMBER },
    confidence: { type: SchemaType.STRING },
    transferOut: { type: SchemaType.STRING },
    transferIn: { type: SchemaType.STRING },
  },
  required: ['type', 'playerName', 'team', 'title', 'detail', 'sentiment'],
} satisfies Schema;

const INSIGHTS_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    insights: {
      type: SchemaType.ARRAY,
      items: INSIGHT_ITEM_SCHEMA,
    },
  },
  required: ['insights'],
} satisfies Schema;

function toNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function chipLabel(chip: ChipCode): string {
  return CHIP_LABEL[chip];
}

function isValidEntryId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^\d+$/.test(value) && value.length > 0;
}

function normalizeChipName(raw: unknown): ChipCode | null {
  const name = String(raw || '').toLowerCase();
  if (name === '3xc' || name === 'triplecaptain' || name === 'triple_captain') return 'TC';
  if (name === 'bboost' || name === 'benchboost' || name === 'bench_boost') return 'BB';
  if (name === 'freehit' || name === 'free_hit') return 'FH';
  if (name === 'wildcard' || name === 'wild_card') return 'WC';
  return null;
}

function formatChipList(chips: ChipCode[]): string {
  if (!chips.length) return 'none';
  return chips.map(chipLabel).join(', ');
}

function formatUsedChipSummary(usedCounts: Record<ChipCode, number>): string {
  const used = CHIP_ORDER.filter((chip) => usedCounts[chip] > 0).map((chip) => {
    const count = usedCounts[chip];
    if (chip === 'WC') return count > 1 ? `${chipLabel(chip)} x${count}` : chipLabel(chip);
    return chipLabel(chip);
  });
  return used.length ? used.join(', ') : 'none';
}

async function fetchManagerChipUsage(entryId: string, gameweek?: number): Promise<ChipUsage | null> {
  try {
    const res = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/history/`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const history = await res.json();
    const chips: Array<{ name?: string; event?: number }> = Array.isArray(history?.chips)
      ? history.chips
      : [];

    const usedCounts: Record<ChipCode, number> = { TC: 0, BB: 0, FH: 0, WC: 0 };
    let playedThisGw: ChipCode | null = null;

    for (const chipPlay of chips) {
      const chip = normalizeChipName(chipPlay?.name);
      if (!chip) continue;
      usedCounts[chip] += 1;

      const event = Number(chipPlay?.event);
      if (typeof gameweek === 'number' && Number.isFinite(event) && event === gameweek) {
        playedThisGw = chip;
      }
    }

    const wildcardAvailable =
      usedCounts.WC === 0 ||
      (usedCounts.WC === 1 && typeof gameweek === 'number' && gameweek >= 20);

    const available = CHIP_ORDER.filter((chip) => {
      if (chip === 'WC') return wildcardAvailable;
      return usedCounts[chip] === 0;
    });

    return { usedCounts, available, playedThisGw };
  } catch {
    return null;
  }
}

function buildChipContextText(chipUsage: ChipUsage | null, gameweek?: number): string {
  if (!chipUsage) return 'Manager chip history unavailable.';
  const gwLabel = typeof gameweek === 'number' ? `GW${gameweek}` : 'this gameweek';
  const now = chipUsage.playedThisGw
    ? `${chipLabel(chipUsage.playedThisGw)} already played in ${gwLabel}`
    : `No chip played yet in ${gwLabel}`;
  return `${now}. Available chips: ${formatChipList(chipUsage.available)}. Used so far: ${formatUsedChipSummary(chipUsage.usedCounts)}.`;
}

function confidenceFromGain(gain: number): 'high' | 'medium' | 'low' {
  if (gain >= 2.5) return 'high';
  if (gain >= 1) return 'medium';
  return 'low';
}

function playerKey(p: { id?: string; name?: string; team?: string; position?: string }): string {
  if (p.id) return `id:${p.id}`;
  return `${String(p.name || '').toLowerCase()}|${String(p.team || '').toUpperCase()}|${String(p.position || '')}`;
}

function inputFixtures(p: InputPlayer): InputFixture[] {
  return Array.isArray(p.fixtures) ? p.fixtures : [];
}

function fixtureText(fixtures: Array<{ opp?: string; H?: boolean }>): string {
  if (!fixtures.length) return 'No immediate fixture data';
  return fixtures
    .slice(0, 2)
    .map((f) => `${String(f.opp || '?')} (${f.H ? 'H' : 'A'})`)
    .join(', ');
}

function avgFixtureDiff(fixtures: Array<{ diff?: number }>): number {
  if (!fixtures.length) return 3;
  const vals = fixtures.map((f) => toNum(f.diff, 3));
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function toInputPlayer(raw: unknown): InputPlayer | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as InputPlayer;
  if (!p.name || !p.team || !p.position) return null;
  return {
    id: p.id,
    name: String(p.name),
    team: String(p.team).toUpperCase(),
    position: p.position,
    price: toNum(p.price, 0),
    form: toNum(p.form, 0),
    expPoints: toNum(p.expPoints, 0),
    minutesProb: clamp(toNum(p.minutesProb, 0.75), 0, 1),
    ownership: clamp(toNum(p.ownership, 100), 0, 100),
    status: p.status === 'out' ? 'out' : p.status === 'flag' ? 'flag' : 'fit',
    fixtures: Array.isArray(p.fixtures)
      ? p.fixtures.map((f) => ({ opp: String(f.opp || ''), H: !!f.H, diff: toNum(f.diff, 3) }))
      : [],
    priceChangeEvent: Number.isFinite(p.priceChangeEvent as number) ? toNum(p.priceChangeEvent) : undefined,
    transfersInEvent: Number.isFinite(p.transfersInEvent as number) ? toNum(p.transfersInEvent) : undefined,
    transfersOutEvent: Number.isFinite(p.transfersOutEvent as number) ? toNum(p.transfersOutEvent) : undefined,
  };
}

function normalizeInsight(raw: unknown, source: 'model' | 'gemini'): Insight {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const sentimentRaw = String(obj.sentiment || 'neutral').toLowerCase();
  const sentiment: InsightSentiment =
    sentimentRaw === 'positive' || sentimentRaw === 'negative' ? (sentimentRaw as InsightSentiment) : 'neutral';

  return {
    type: String(obj.type || 'value_pick').toLowerCase(),
    playerName: String(obj.playerName || '').slice(0, 60),
    team: String(obj.team || '').slice(0, 8),
    title: String(obj.title || '').slice(0, 72),
    detail: String(obj.detail || '').slice(0, 300),
    sentiment,
    expectedGain: Number.isFinite(obj.expectedGain as number) ? round1(toNum(obj.expectedGain)) : undefined,
    confidence:
      obj.confidence === 'high' || obj.confidence === 'medium' || obj.confidence === 'low'
        ? (obj.confidence as 'high' | 'medium' | 'low')
        : undefined,
    transferOut: typeof obj.transferOut === 'string' ? obj.transferOut.slice(0, 60) : undefined,
    transferIn: typeof obj.transferIn === 'string' ? obj.transferIn.slice(0, 60) : undefined,
    source,
  };
}

function dedupeInsights(insights: Insight[]): Insight[] {
  const seen = new Set<string>();
  const out: Insight[] = [];
  for (const ins of insights) {
    if (!ins.title || !ins.detail) continue;
    const key = `${ins.type}|${ins.playerName.toLowerCase()}|${ins.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ins);
  }
  return out;
}

function buildUniverseFallback(squadPlayers: InputPlayer[]): Player[] {
  return squadPlayers.map((p, idx) => ({
    id: p.id || `${p.name}-${idx}`,
    name: p.name || 'Unknown',
    team: p.team || 'UNK',
    position: (p.position || 'MID') as Position,
    price: toNum(p.price, 0),
    expPoints: toNum(p.expPoints, 0),
    form: toNum(p.form, 0),
    minutesProb: clamp(toNum(p.minutesProb, 0.75), 0, 1),
    nextFixtures: (p.fixtures || []).map((f) => ({
      opp: String(f.opp || ''),
      H: !!f.H,
      diff: toNum(f.diff, 3),
    })),
    status: p.status || 'fit',
    ownership: clamp(toNum(p.ownership, 100), 0, 100),
    priceChangeEvent: p.priceChangeEvent,
    transfersInEvent: p.transfersInEvent,
    transfersOutEvent: p.transfersOutEvent,
  }));
}

function buildChipAdviceInsight(params: {
  squadPlayers: InputPlayer[];
  gameweek?: number;
  chipUsage?: ChipUsage | null;
}): Insight | null {
  const { squadPlayers, gameweek, chipUsage } = params;
  if (!chipUsage) return null;

  const gwLabel = typeof gameweek === 'number' ? `GW${gameweek}` : 'this gameweek';
  const usedSummary = formatUsedChipSummary(chipUsage.usedCounts);
  const availableSummary = formatChipList(chipUsage.available);

  if (chipUsage.playedThisGw) {
    const activeChip = chipLabel(chipUsage.playedThisGw);
    return {
      type: 'chip_advice',
      playerName: '',
      team: '',
      title: `${activeChip} already active`,
      detail: `You already activated ${activeChip} in ${gwLabel}, so no extra chip can be played now. Remaining chips: ${availableSummary}. Used so far: ${usedSummary}.`,
      sentiment: 'neutral',
      source: 'model',
    };
  }

  if (chipUsage.available.length === 0) {
    return {
      type: 'chip_advice',
      playerName: '',
      team: '',
      title: 'No chips remaining',
      detail: `All major chips are already used. Focus ${gwLabel} on transfers and captaincy only. Used so far: ${usedSummary}.`,
      sentiment: 'neutral',
      source: 'model',
    };
  }

  const weighted = [...squadPlayers]
    .map((p) => ({
      p,
      weightedExp:
        toNum(p.expPoints, 0) * (0.6 + 0.4 * clamp(toNum(p.minutesProb, 0.75), 0, 1)),
    }))
    .sort((a, b) => b.weightedExp - a.weightedExp);

  const starters = weighted.slice(0, 11).map((x) => x.p);
  const bench = weighted.slice(11).map((x) => x.p);
  const captain = starters[0];

  const captainProjection = captain
    ? round1(
        toNum(captain.expPoints, 0) *
          (0.7 + 0.3 * clamp(toNum(captain.minutesProb, 0.75), 0, 1))
      )
    : 0;

  const benchProjection = round1(
    bench.reduce(
      (sum, p) =>
        sum +
        toNum(p.expPoints, 0) * (0.55 + 0.45 * clamp(toNum(p.minutesProb, 0.75), 0, 1)),
      0
    )
  );

  const weakStarters = starters.filter(
    (p) =>
      p.status !== 'fit' ||
      toNum(p.expPoints, 0) < 3.4 ||
      clamp(toNum(p.minutesProb, 0.75), 0, 1) < 0.65
  ).length;

  const hardFixtureStarters = starters.filter(
    (p) => avgFixtureDiff(inputFixtures(p)) >= 3.7
  ).length;

  const squadWeak = squadPlayers.filter(
    (p) =>
      p.status !== 'fit' ||
      toNum(p.expPoints, 0) < 3.3 ||
      clamp(toNum(p.minutesProb, 0.75), 0, 1) < 0.65
  ).length;

  type ChipScore = {
    chip: ChipCode;
    ratio: number;
    rationale: string;
  };

  const candidates: ChipScore[] = [];

  if (chipUsage.available.includes('TC') && captain) {
    const threshold = 7.5;
    candidates.push({
      chip: 'TC',
      ratio: captainProjection / threshold,
      rationale: `${captain.name} projects around ${captainProjection.toFixed(1)} pts as your captain.`,
    });
  }

  if (chipUsage.available.includes('BB')) {
    const threshold = 11.5;
    candidates.push({
      chip: 'BB',
      ratio: benchProjection / threshold,
      rationale: `Your weighted bench projection is ${benchProjection.toFixed(1)} pts this week.`,
    });
  }

  if (chipUsage.available.includes('FH')) {
    const fhPressure = weakStarters * 1.9 + hardFixtureStarters * 0.8;
    const threshold = 8;
    candidates.push({
      chip: 'FH',
      ratio: fhPressure / threshold,
      rationale: `${weakStarters} weak-risk starters and ${hardFixtureStarters} hard-fixture starters increase Free Hit value.`,
    });
  }

  if (chipUsage.available.includes('WC')) {
    const threshold = 8;
    candidates.push({
      chip: 'WC',
      ratio: squadWeak / threshold,
      rationale: `${squadWeak} players show low projection or minutes risk across your 15.`,
    });
  }

  if (!candidates.length) return null;

  const best = [...candidates].sort((a, b) => b.ratio - a.ratio)[0];
  if (!best || best.ratio < 1) {
    const bestLabel = chipLabel(best?.chip || 'TC');
    return {
      type: 'chip_advice',
      playerName: '',
      team: '',
      title: `Hold chips for now`,
      detail: `No chip clears a strong trigger for ${gwLabel}. Best candidate is ${bestLabel}, but metrics suggest waiting. Available chips: ${availableSummary}. Used so far: ${usedSummary}.`,
      sentiment: 'neutral',
      source: 'model',
    };
  }

  const bestLabel = chipLabel(best.chip);
  return {
    type: 'chip_advice',
    playerName: '',
    team: '',
    title: `Chip call: ${bestLabel}`,
    detail: `${bestLabel} is the strongest play for ${gwLabel}. ${best.rationale} Available chips: ${availableSummary}. Used so far: ${usedSummary}.`,
    sentiment: 'positive',
    source: 'model',
  };
}

function buildDeterministicInsights(params: {
  squadPlayers: InputPlayer[];
  universePlayers: Player[];
  bank: number;
  gameweek?: number;
  chipUsage?: ChipUsage | null;
}): Insight[] {
  const { squadPlayers, universePlayers, bank, gameweek, chipUsage } = params;
  const squadIds = new Set(squadPlayers.map((p) => playerKey(p)));
  const isInSquad = (p: Player) => squadIds.has(playerKey(p));

  const scoreStarter = (p: InputPlayer) => {
    const exp = toNum(p.expPoints, 0);
    const mins = clamp(toNum(p.minutesProb, 0.75), 0, 1);
    const form = toNum(p.form, 0);
    const fixtureAdj = 1 + (3 - avgFixtureDiff(inputFixtures(p))) * 0.08;
    return exp * (0.7 + 0.3 * mins) * fixtureAdj + form * 0.08;
  };

  const weakScore = (p: InputPlayer) => {
    const exp = toNum(p.expPoints, 0);
    const mins = clamp(toNum(p.minutesProb, 0.75), 0, 1);
    const diff = avgFixtureDiff(inputFixtures(p));
    const flaggedPenalty = p.status === 'out' ? 2.2 : p.status === 'flag' ? 1.2 : 0;
    return (5.6 - exp) + (1 - mins) * 2 + Math.max(0, diff - 3) * 0.6 + flaggedPenalty;
  };

  const captain = [...squadPlayers].sort((a, b) => scoreStarter(b) - scoreStarter(a))[0];
  const transferOut = [...squadPlayers].sort((a, b) => weakScore(b) - weakScore(a))[0];

  const budget = toNum(transferOut?.price, 0) + bank + 0.05;
  const transferInCandidates = universePlayers
    .filter((p) => p.position === transferOut?.position)
    .filter((p) => !isInSquad(p))
    .filter((p) => p.price <= budget)
    .filter((p) => p.status !== 'out')
    .filter((p) => toNum(p.minutesProb, 0.75) >= 0.6)
    .sort((a, b) => {
      const gainA = toNum(a.expPoints, 0) - toNum(transferOut?.expPoints, 0);
      const gainB = toNum(b.expPoints, 0) - toNum(transferOut?.expPoints, 0);
      const fixtureA = 3 - avgFixtureDiff(a.nextFixtures || []);
      const fixtureB = 3 - avgFixtureDiff(b.nextFixtures || []);
      return gainB + fixtureB * 0.35 - (gainA + fixtureA * 0.35);
    });

  const transferIn = transferInCandidates[0];
  const transferGain = transferIn
    ? round1(toNum(transferIn.expPoints, 0) - toNum(transferOut?.expPoints, 0))
    : 0;

  const differential = universePlayers
    .filter((p) => !isInSquad(p))
    .filter((p) => p.status !== 'out')
    .filter((p) => toNum(p.ownership, 100) <= 15)
    .filter((p) => toNum(p.minutesProb, 0.75) >= 0.65)
    .sort((a, b) => {
      const aScore = toNum(a.expPoints, 0) + (15 - toNum(a.ownership, 100)) * 0.08 - avgFixtureDiff(a.nextFixtures || []) * 0.1;
      const bScore = toNum(b.expPoints, 0) + (15 - toNum(b.ownership, 100)) * 0.08 - avgFixtureDiff(b.nextFixtures || []) * 0.1;
      return bScore - aScore;
    })[0];

  const fallerInSquad = [...squadPlayers]
    .filter((p) => toNum(p.priceChangeEvent, 0) < 0)
    .sort((a, b) => toNum(a.priceChangeEvent, 0) - toNum(b.priceChangeEvent, 0))[0];

  const riserOutside = universePlayers
    .filter((p) => !isInSquad(p))
    .filter((p) => toNum(p.priceChangeEvent, 0) > 0)
    .sort((a, b) => {
      const d = toNum(b.priceChangeEvent, 0) - toNum(a.priceChangeEvent, 0);
      if (d !== 0) return d;
      const netB = toNum(b.transfersInEvent, 0) - toNum(b.transfersOutEvent, 0);
      const netA = toNum(a.transfersInEvent, 0) - toNum(a.transfersOutEvent, 0);
      return netB - netA;
    })[0];

  const rotationRisk = [...squadPlayers]
    .filter((p) => p.status !== 'fit' || toNum(p.minutesProb, 0.75) < 0.72)
    .sort((a, b) => {
      const aRisk = (1 - toNum(a.minutesProb, 0.75)) + (a.status === 'out' ? 1 : a.status === 'flag' ? 0.5 : 0);
      const bRisk = (1 - toNum(b.minutesProb, 0.75)) + (b.status === 'out' ? 1 : b.status === 'flag' ? 0.5 : 0);
      return bRisk - aRisk;
    })[0];

  const out: Insight[] = [];

  const chipAdvice = buildChipAdviceInsight({ squadPlayers, gameweek, chipUsage });
  if (chipAdvice) {
    out.push(chipAdvice);
  }

  if (captain) {
    out.push({
      type: 'captain',
      playerName: captain.name || '',
      team: captain.team || '',
      title: `Captain ${captain.name}`,
      detail: `${captain.name} leads your squad projections at ${toNum(captain.expPoints, 0).toFixed(1)} pts with ${Math.round(clamp(toNum(captain.minutesProb, 0.75), 0, 1) * 100)}% minutes confidence and ${fixtureText(inputFixtures(captain))}.`,
      sentiment: 'positive',
      source: 'model',
    });
  }

  if (transferOut) {
    out.push({
      type: 'transfer_out',
      playerName: transferOut.name || '',
      team: transferOut.team || '',
      title: `Consider selling ${transferOut.name}`,
      detail: `${transferOut.name} projects only ${toNum(transferOut.expPoints, 0).toFixed(1)} pts with ${Math.round(clamp(toNum(transferOut.minutesProb, 0.75), 0, 1) * 100)}% minutes and fixtures ${fixtureText(inputFixtures(transferOut))}.`,
      sentiment: 'negative',
      source: 'model',
      transferOut: transferOut.name || '',
    });
  }

  if (transferOut && transferIn) {
    out.push({
      type: 'transfer_in',
      playerName: transferIn.name,
      team: transferIn.team,
      title: `Buy ${transferIn.name} (${transferIn.team})`,
      detail: `${transferIn.name} fits your budget at £${transferIn.price.toFixed(1)}m and projects ${toNum(transferIn.expPoints, 0).toFixed(1)} pts, around +${transferGain.toFixed(1)} vs ${transferOut.name}.`,
      sentiment: 'positive',
      expectedGain: transferGain,
      confidence: confidenceFromGain(transferGain),
      source: 'model',
      transferOut: transferOut.name || '',
      transferIn: transferIn.name,
    });
  }

  if (differential) {
    out.push({
      type: 'differential',
      playerName: differential.name,
      team: differential.team,
      title: `Differential: ${differential.name}`,
      detail: `${differential.name} is at ${toNum(differential.ownership, 0).toFixed(1)}% ownership with ${toNum(differential.expPoints, 0).toFixed(1)} projected points and ${fixtureText(differential.nextFixtures || [])}.`,
      sentiment: 'positive',
      source: 'model',
    });
  }

  if (fallerInSquad) {
    out.push({
      type: 'price_watch',
      playerName: fallerInSquad.name || '',
      team: fallerInSquad.team || '',
      title: `Price watch: ${fallerInSquad.name}`,
      detail: `${fallerInSquad.name} dropped ${toNum(fallerInSquad.priceChangeEvent, 0).toFixed(1)} this event with net transfers ${(toNum(fallerInSquad.transfersInEvent, 0) - toNum(fallerInSquad.transfersOutEvent, 0)).toLocaleString()}. Monitor before deadline.`,
      sentiment: 'negative',
      source: 'model',
    });
  } else if (riserOutside) {
    out.push({
      type: 'price_watch',
      playerName: riserOutside.name,
      team: riserOutside.team,
      title: `Price watch: ${riserOutside.name}`,
      detail: `${riserOutside.name} rose ${toNum(riserOutside.priceChangeEvent, 0).toFixed(1)} this event with strong transfer momentum (${(toNum(riserOutside.transfersInEvent, 0) - toNum(riserOutside.transfersOutEvent, 0)).toLocaleString()} net).`,
      sentiment: 'neutral',
      source: 'model',
    });
  }

  if (rotationRisk) {
    out.push({
      type: 'rotation_risk',
      playerName: rotationRisk.name || '',
      team: rotationRisk.team || '',
      title: `Minutes risk: ${rotationRisk.name}`,
      detail: `${rotationRisk.name} has only ${Math.round(clamp(toNum(rotationRisk.minutesProb, 0.75), 0, 1) * 100)}% minutes confidence${rotationRisk.status !== 'fit' ? ` and status ${rotationRisk.status}` : ''}. Have a playable bench cover ready.`,
      sentiment: 'negative',
      source: 'model',
    });
  }

  if (out.length < 5) {
    const valuePick = universePlayers
      .filter((p) => !isInSquad(p))
      .filter((p) => p.status === 'fit')
      .filter((p) => p.price <= 6.5)
      .sort((a, b) => {
        const aVal = toNum(a.expPoints, 0) / Math.max(4, toNum(a.price, 0));
        const bVal = toNum(b.expPoints, 0) / Math.max(4, toNum(b.price, 0));
        return bVal - aVal;
      })[0];

    if (valuePick) {
      out.push({
        type: 'value_pick',
        playerName: valuePick.name,
        team: valuePick.team,
        title: `Value pick: ${valuePick.name}`,
        detail: `${valuePick.name} offers strong value at £${valuePick.price.toFixed(1)}m with ${toNum(valuePick.expPoints, 0).toFixed(1)} projected points and ${Math.round(clamp(toNum(valuePick.minutesProb, 0.75), 0, 1) * 100)}% minutes confidence.`,
        sentiment: 'positive',
        source: 'model',
      });
    }
  }

  return dedupeInsights(out).slice(0, 8);
}

async function fetchUniverseWithTimeout(squadPlayers: InputPlayer[], timeoutMs: number): Promise<Player[]> {
  const fallback = buildUniverseFallback(squadPlayers);
  const universeTask: Promise<Player[]> = fetchPlayersWithMarket('baseline').catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Insights Generate] Universe fetch failed, using squad fallback:', msg);
    return fallback;
  });

  const timeoutTask: Promise<Player[]> = new Promise((resolve) => {
    setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([universeTask, timeoutTask]);
}

async function generateGeminiInsights(apiKey: string, prompt: string): Promise<Insight[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: INSIGHTS_RESPONSE_SCHEMA,
      temperature: 0.2,
      maxOutputTokens: 1200,
    },
  });

  const result = await model.generateContent(prompt);
  const rawText = extractGeminiResponseText(result);
  const parsed = parseGeminiJsonArray(rawText, {
    context: 'Insights Generate',
    arrayKeys: ['insights'],
    objectKeys: ['type', 'title', 'detail', 'sentiment'],
  });
  return parsed.map((item) => normalizeInsight(item, 'gemini')).filter((item) => item.title && item.detail).slice(0, 4);
}

async function generateGeminiWithTimeout(apiKey: string, prompt: string, timeoutMs: number): Promise<{ insights: Insight[]; timedOut: boolean }> {
  const task: Promise<Insight[]> = generateGeminiInsights(apiKey, prompt).catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Insights Generate] Gemini enrichment failed:', msg);
    return [];
  });

  const timeout: Promise<null> = new Promise((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  const winner = await Promise.race<Insight[] | null>([task, timeout]);
  if (winner === null) {
    return { insights: [], timedOut: true };
  }
  return { insights: winner, timedOut: false };
}

export async function POST(request: Request) {
  const started = Date.now();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const bodyObj = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  const rawPlayers: unknown[] = Array.isArray(bodyObj.players) ? bodyObj.players : [];
  const squadPlayers = rawPlayers.map(toInputPlayer).filter((p): p is InputPlayer => !!p);
  if (squadPlayers.length === 0) {
    return NextResponse.json({ error: 'No players provided' }, { status: 400 });
  }

  const gameweek = Number.isFinite(bodyObj.gameweek) ? Number(bodyObj.gameweek) : undefined;
  const bank = Number.isFinite(bodyObj.bank) ? Number(bodyObj.bank) : 0;
  const entryIdRaw = typeof bodyObj.entryId === 'string' ? bodyObj.entryId.trim() : '';
  const entryId = isValidEntryId(entryIdRaw) ? entryIdRaw : null;

  const [universePlayers, chipUsage] = await Promise.all([
    fetchUniverseWithTimeout(squadPlayers, 3500),
    entryId ? fetchManagerChipUsage(entryId, gameweek) : Promise.resolve(null),
  ]);

  const deterministic = buildDeterministicInsights({
    squadPlayers,
    universePlayers,
    bank,
    gameweek,
    chipUsage,
  });

  const positions = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const p of squadPlayers) {
    const pos = p.position;
    if (pos === 'GK' || pos === 'DEF' || pos === 'MID' || pos === 'FWD') {
      positions[pos]++;
    }
  }

  const summary = squadPlayers
    .map((p) => {
      const fText = fixtureText(inputFixtures(p));
      return `${p.name} | ${p.position} | ${p.team} | £${toNum(p.price, 0).toFixed(1)}m | EP ${toNum(p.expPoints, 0).toFixed(1)} | Min ${Math.round(clamp(toNum(p.minutesProb, 0.75), 0, 1) * 100)}% | Own ${toNum(p.ownership, 0).toFixed(1)}% | ${fText}`;
    })
    .join('\n');

  const baselineSummary = deterministic
    .map((ins) => `- [${ins.type}] ${ins.title}: ${ins.detail}`)
    .join('\n');

  const geminiPrompt = `${PROMPT}\n\nSQUAD CONTEXT (GW${gameweek ?? '?'}, Bank £${bank.toFixed(1)}m):\nFormation: ${positions.GK}-${positions.DEF}-${positions.MID}-${positions.FWD}\nCHIP CONTEXT: ${buildChipContextText(chipUsage, gameweek)}\n\nPlayers:\n${summary}\n\nDETERMINISTIC BASELINE (do not duplicate):\n${baselineSummary}`;

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  let geminiInsights: Insight[] = [];
  let geminiTimedOut = false;

  if (apiKey) {
    const geminiResult = await generateGeminiWithTimeout(apiKey, geminiPrompt, GEMINI_TIMEOUT_MS);
    geminiInsights = geminiResult.insights;
    geminiTimedOut = geminiResult.timedOut;
  }

  const merged = dedupeInsights([...deterministic, ...geminiInsights]).slice(0, 10);
  const ended = Date.now();

  return NextResponse.json({
    insights: merged,
    gameweek,
    source: geminiInsights.length > 0 ? 'hybrid' : 'deterministic',
    geminiTimedOut,
    latencyMs: ended - started,
  });
}
