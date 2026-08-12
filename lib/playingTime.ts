import type {
  PlayingTimeConfidence,
  PlayingTimeEstimate,
  PlayingTimeSource,
} from '@/lib/data';

export type UsageSnapshot = {
  completedGameweek: number;
  team: string;
  teamMatchesPlayed: number;
  startsTotal: number;
  minutesTotal: number;
};

export type AvailabilitySignal = {
  signal: string;
  adjustment?: number | null;
  confidence?: string | null;
};

export type PlayingTimeInput = {
  team: string;
  starts: number;
  minutes: number;
  teamMatchesPlayed: number;
  statusCode: string;
  chanceOfPlaying: number | null;
  snapshots?: UsageSnapshot[];
  signals?: AvailabilitySignal[];
};

const PRIOR_SEASON_MATCHES = 38;
const HISTORICAL_PRIOR_STRENGTH = 6;
const NEUTRAL_PRIOR_STRENGTH = 4;
const RECENT_MATCH_LIMIT = 6;
const RECENCY_DECAY = 0.8;

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const finiteNonNegative = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;

function confidenceWeight(confidence?: string | null): number {
  if (confidence === 'high') return 1;
  if (confidence === 'medium') return 0.6;
  return 0.3;
}

export function isPlayingTimeSignal(signal: string): boolean {
  return signal === 'starts' || signal === 'benched' || signal === 'injured' ||
    signal === 'returning' || signal === 'rotation_risk';
}

export function performanceSignalMultiplier(signals: AvailabilitySignal[]): number {
  const adjustment = signals
    .filter((signal) => !isPlayingTimeSignal(signal.signal))
    .reduce((sum, signal) => sum + (Number(signal.adjustment) || 0) * confidenceWeight(signal.confidence), 0);
  return clamp(1 + adjustment * 0.8, 0.75, 1.12);
}

function statusAvailability(statusCode: string, chance: number | null): number {
  if (typeof chance === 'number' && Number.isFinite(chance)) {
    return clamp(chance / 100, 0, 1);
  }
  if (statusCode === 'a') return 1;
  if (statusCode === 'd') return 0.75;
  return 0;
}

type RecentUsage = { matches: number; startRate: number; minutesPerMatch: number };

function recentUsage(snapshots: UsageSnapshot[], current: UsageSnapshot): RecentUsage | null {
  const byGameweek = new Map<number, UsageSnapshot>();
  for (const snapshot of snapshots) {
    if (snapshot.team === current.team) byGameweek.set(snapshot.completedGameweek, snapshot);
  }

  // The live bootstrap is a synthetic newest observation. If the scheduled
  // job already captured the same counters, replacing it simply yields no delta.
  const latestStoredGw = Math.max(-1, ...byGameweek.keys());
  byGameweek.set(Math.max(latestStoredGw + 1, current.completedGameweek), current);

  const ordered = [...byGameweek.values()].sort((a, b) =>
    a.teamMatchesPlayed - b.teamMatchesPlayed || a.completedGameweek - b.completedGameweek
  );
  const intervals: Array<{ matches: number; starts: number; minutes: number }> = [];

  for (let i = 1; i < ordered.length; i++) {
    const previous = ordered[i - 1];
    const next = ordered[i];
    if (previous.team !== next.team) continue;
    const matches = next.teamMatchesPlayed - previous.teamMatchesPlayed;
    const starts = next.startsTotal - previous.startsTotal;
    const minutes = next.minutesTotal - previous.minutesTotal;
    if (matches <= 0 || starts < 0 || minutes < 0) continue;
    if (starts > matches || minutes > matches * 120) continue;
    intervals.push({ matches, starts, minutes });
  }

  let matchesUsed = 0;
  let weightedMatches = 0;
  let weightedStarts = 0;
  let weightedMinutes = 0;
  let age = 0;

  for (let i = intervals.length - 1; i >= 0 && matchesUsed < RECENT_MATCH_LIMIT; i--) {
    const interval = intervals[i];
    const take = Math.min(interval.matches, RECENT_MATCH_LIMIT - matchesUsed);
    const startRate = interval.starts / interval.matches;
    const minutesPerMatch = interval.minutes / interval.matches;
    for (let match = 0; match < take; match++) {
      const weight = Math.pow(RECENCY_DECAY, age++);
      weightedMatches += weight;
      weightedStarts += startRate * weight;
      weightedMinutes += minutesPerMatch * weight;
      matchesUsed++;
    }
  }

  if (matchesUsed === 0 || weightedMatches === 0) return null;
  return {
    matches: matchesUsed,
    startRate: clamp(weightedStarts / weightedMatches, 0, 1),
    minutesPerMatch: clamp(weightedMinutes / weightedMatches, 0, 90),
  };
}

function applySignals(
  startProbability: number,
  expectedMinutes: number,
  signals: AvailabilitySignal[],
): { startProbability: number; expectedMinutes: number; forcedOut: boolean } {
  let start = startProbability;
  let minutes = expectedMinutes;
  let forcedOut = false;

  for (const signal of signals.filter((value) => isPlayingTimeSignal(value.signal))) {
    const confidence = signal.confidence || 'low';
    if (confidence === 'high' && signal.signal === 'starts') {
      start = Math.max(start, 0.95);
      minutes = Math.max(minutes, 75);
      continue;
    }
    if (confidence === 'high' && signal.signal === 'benched') {
      start = Math.min(start, 0.05);
      minutes = Math.min(minutes, 25);
      continue;
    }
    if (confidence === 'high' && signal.signal === 'injured') {
      start = 0;
      minutes = 0;
      forcedOut = true;
      continue;
    }
    if (confidence === 'high' && signal.signal === 'returning') {
      start = Math.max(start, 0.6);
      minutes = Math.max(minutes, 55);
      continue;
    }
    if (signal.signal === 'rotation_risk') {
      const factor = confidence === 'high' ? 0.75 : confidence === 'medium' ? 0.85 : 0.93;
      start *= factor;
      minutes *= factor;
      continue;
    }

    const factor = clamp(
      1 + 2 * (Number(signal.adjustment) || 0) * confidenceWeight(confidence),
      0.4,
      1.25,
    );
    start *= factor;
    minutes *= factor;
  }

  return {
    startProbability: clamp(start, 0, 1),
    expectedMinutes: clamp(minutes, 0, 90),
    forcedOut,
  };
}

export function estimatePlayingTime(input: PlayingTimeInput): PlayingTimeEstimate {
  const starts = finiteNonNegative(input.starts);
  const minutes = finiteNonNegative(input.minutes);
  const teamMatchesPlayed = Math.floor(finiteNonNegative(input.teamMatchesPlayed));
  const snapshots = (input.snapshots || [])
    .filter((snapshot) => snapshot.team === input.team)
    .sort((a, b) => a.completedGameweek - b.completedGameweek);
  const preseason = snapshots.find((snapshot) => snapshot.completedGameweek === 0);

  const hasPreseasonHistory = !!preseason && (preseason.startsTotal > 0 || preseason.minutesTotal > 0);
  const hasBootstrapHistory = teamMatchesPlayed === 0 && (starts > 0 || minutes > 0);
  const historicalStarts = hasPreseasonHistory ? preseason!.startsTotal : hasBootstrapHistory ? starts : 0;
  const historicalMinutes = hasPreseasonHistory ? preseason!.minutesTotal : hasBootstrapHistory ? minutes : 0;
  const hasHistory = historicalStarts > 0 || historicalMinutes > 0;
  const priorStart = hasHistory ? clamp(historicalStarts / PRIOR_SEASON_MATCHES, 0, 1) : 0.5;
  const priorMinutes = hasHistory ? clamp(historicalMinutes / PRIOR_SEASON_MATCHES, 0, 90) : 45;
  const priorStrength = hasHistory ? HISTORICAL_PRIOR_STRENGTH : NEUTRAL_PRIOR_STRENGTH;

  let currentStarts = starts;
  let currentMinutes = minutes;
  if (teamMatchesPlayed > 0 && preseason) {
    const countersStillIncludePreseason = starts > teamMatchesPlayed || minutes > teamMatchesPlayed * 90;
    if (countersStillIncludePreseason && starts >= preseason.startsTotal && minutes >= preseason.minutesTotal) {
      currentStarts = starts - preseason.startsTotal;
      currentMinutes = minutes - preseason.minutesTotal;
    }
  }
  currentStarts = clamp(currentStarts, 0, teamMatchesPlayed);
  currentMinutes = clamp(currentMinutes, 0, teamMatchesPlayed * 90);

  let startProbability: number;
  let expectedMinutes: number;
  let source: PlayingTimeSource;
  let sampleMatches: number;

  if (teamMatchesPlayed > 0) {
    startProbability = (currentStarts + priorStart * priorStrength) / (teamMatchesPlayed + priorStrength);
    expectedMinutes = (currentMinutes + priorMinutes * priorStrength) / (teamMatchesPlayed + priorStrength);
    source = 'season';
    sampleMatches = teamMatchesPlayed + priorStrength;
  } else {
    startProbability = priorStart;
    expectedMinutes = priorMinutes;
    source = hasHistory ? 'historical' : 'prior';
    // Report effective Bayesian sample size, not the 38-match denominator used
    // to normalize the prior-season cumulative counters.
    sampleMatches = priorStrength;
  }

  const completedGameweek = Math.max(0, ...snapshots.map((snapshot) => snapshot.completedGameweek));
  const recent = recentUsage(snapshots, {
    completedGameweek,
    team: input.team,
    teamMatchesPlayed,
    startsTotal: starts,
    minutesTotal: minutes,
  });
  if (recent) {
    const recentWeight = Math.min(0.6, recent.matches * 0.1);
    startProbability = startProbability * (1 - recentWeight) + recent.startRate * recentWeight;
    expectedMinutes = expectedMinutes * (1 - recentWeight) + recent.minutesPerMatch * recentWeight;
    source = 'recent';
  }

  const signalled = applySignals(startProbability, expectedMinutes, input.signals || []);
  const availability = signalled.forcedOut
    ? 0
    : statusAvailability(input.statusCode, input.chanceOfPlaying);
  startProbability = clamp(signalled.startProbability * availability, 0, 1);
  expectedMinutes = clamp(signalled.expectedMinutes * availability, 0, 90);

  const appearanceProbability = clamp(Math.max(startProbability, expectedMinutes / 60), 0, 1);
  const sixtyMinuteProbability = clamp(Math.min(startProbability, expectedMinutes / 90), 0, appearanceProbability);
  const factor = clamp(
    0.2 * appearanceProbability + 0.4 * (expectedMinutes / 90) + 0.4 * sixtyMinuteProbability,
    0,
    1,
  );
  const evidenceMatches = Math.max(sampleMatches, recent?.matches || 0);
  const confidence: PlayingTimeConfidence = source === 'prior'
    ? 'low'
    : evidenceMatches >= 8 ? 'high' : evidenceMatches >= 3 ? 'medium' : 'low';

  return {
    modelVersion: 'usage-v2',
    startProbability: clamp(startProbability, 0, 1),
    appearanceProbability,
    sixtyMinuteProbability,
    expectedMinutes,
    factor,
    source,
    confidence,
    sampleMatches: evidenceMatches,
    recentMatches: recent?.matches || 0,
  };
}
