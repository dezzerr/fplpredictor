export type ProjectionBaseSource = 'official-ep' | 'preseason-blend';

export type ProjectionBaseEstimate = {
  points: number;
  source: ProjectionBaseSource;
  historicalWeight: number;
  historicalFixturePoints: number;
};

export type ProjectionBaseInput = {
  officialExpectedPoints: number;
  pointsPerAppearance: number;
  starts: number;
  minutes: number;
  teamMatchesPlayed: number;
  fixtureFactor: number;
  fixtureCount: number;
};

const PRIOR_SEASON_MATCHES = 38;
const MAX_HISTORICAL_WEIGHT = 0.6;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const nonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

/**
 * FPL's preseason ep_next values are deliberately conservative and can sit
 * well below a proven player's prior scoring rate. At GW1 only, blend that
 * official estimate with prior-season points per appearance, adjusted for the
 * next fixture. Usage-v2 is applied later, so a strong historical scorer who
 * is now a substitute still receives a suitably small final projection.
 */
export function estimateProjectionBase(input: ProjectionBaseInput): ProjectionBaseEstimate {
  const officialExpectedPoints = nonNegative(input.officialExpectedPoints);
  const fixtureCount = Math.floor(nonNegative(input.fixtureCount));

  if (fixtureCount === 0) {
    return {
      points: 0,
      source: 'official-ep',
      historicalWeight: 0,
      historicalFixturePoints: 0,
    };
  }

  const pointsPerAppearance = nonNegative(input.pointsPerAppearance);
  const starts = nonNegative(input.starts);
  const minutes = nonNegative(input.minutes);
  const teamMatchesPlayed = Math.floor(nonNegative(input.teamMatchesPlayed));
  const hasPriorSeasonEvidence = pointsPerAppearance > 0 && (starts > 0 || minutes > 0);

  // Once the season begins, ep_next and form contain current-season evidence;
  // the prior-season blend must no longer pull the projection backwards.
  if (teamMatchesPlayed > 0 || !hasPriorSeasonEvidence) {
    return {
      points: officialExpectedPoints,
      source: 'official-ep',
      historicalWeight: 0,
      historicalFixturePoints: 0,
    };
  }

  const fullMatchEquivalents = Math.max(starts, minutes / 90);
  const evidenceShare = clamp(fullMatchEquivalents / PRIOR_SEASON_MATCHES, 0, 1);
  const historicalWeight = MAX_HISTORICAL_WEIGHT * evidenceShare;
  const fixtureFactor = clamp(nonNegative(input.fixtureFactor) || 1, 0.7, 1.35);
  const historicalFixturePoints = pointsPerAppearance * fixtureFactor * fixtureCount;
  const points = officialExpectedPoints * (1 - historicalWeight) +
    historicalFixturePoints * historicalWeight;

  return {
    points,
    source: 'preseason-blend',
    historicalWeight,
    historicalFixturePoints,
  };
}
