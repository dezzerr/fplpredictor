import type { TeamOdds, GoalscorerOdds } from "@/lib/odds";
import type { Position } from "@/lib/data";

// Derive team goal intensities (Poisson lambdas) from team-level markets.
// Heuristic: use goalLine as proxy for expected total goals (E[T]) and
// split by relative strength from match odds P(H), P(A).
// λH = E[T] * r / (1 + r), λA = E[T] - λH, where r = (P(H)/P(A))^k.
// k dampens extremes; default 0.5.
export function lambdasFromTeamOdds(o: TeamOdds, k = 0.5): { lambdaH: number; lambdaA: number } {
  const pH = clamp01(o.homeWin);
  const pA = clamp01(o.awayWin);
  const tot = o.goalLine && o.goalLine > 0 ? o.goalLine : 2.6; // fallback league avg
  const r = Math.pow(safeDiv(pH, pA), k);
  const lambdaH = tot * (r / (1 + r));
  const lambdaA = Math.max(tot - lambdaH, 0.0001);
  return { lambdaH, lambdaA };
}

// Clean sheet probabilities under independent Poisson goals
export function cleanSheetFromLambdas(lambdaForOpp: number): number {
  return Math.exp(-Math.max(lambdaForOpp, 0));
}

// Player-level goal intensity from anytime scorer probability:
// P(anytime) = 1 - e^{-λg} => λg = -ln(1 - P(anytime))
export function lambdaGFromAnytime(pAnytime: number): number {
  const p = clamp01(pAnytime);
  if (p <= 0) return 0;
  if (p >= 1) return 10; // huge
  return -Math.log(1 - p);
}

// Placeholder assist intensity estimator. If you have xA90, prefer it.
// As a fallback, relate λa to λg with a mild factor.
export function estimateLambdaA(lambdaG: number, pos: Position): number {
  const f = pos === 'FWD' ? 0.5 : pos === 'MID' ? 0.8 : 0.3;
  return Math.max(lambdaG * f, 0);
}

// Expected clean sheet points per position given team/opp lambdas
export function expectedCsPoints(pos: Position, lambdaOpp: number): number {
  const pCS = cleanSheetFromLambdas(lambdaOpp);
  const pts = pos === 'GK' || pos === 'DEF' ? 4 : pos === 'MID' ? 1 : 0;
  return pCS * pts;
}

// Utility helpers
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function safeDiv(a: number, b: number) { return b === 0 ? (a === 0 ? 1 : 10) : a / b; }
