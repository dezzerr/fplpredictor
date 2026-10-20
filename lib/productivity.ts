export type ProjectionBaseSource = 'official-ep' | 'preseason-blend' | 'season-blend';

export type ProjectionBaseEstimate = {
  points: number;
  source: ProjectionBaseSource;
  historicalWeight: number;
  historicalFixturePoints: number;
  blendedPointsPerAppearance: number;
};

export type ProjectionBaseInput = {
  officialExpectedPoints: number;
  currentPointsPerAppearance: number;
  currentMatchesPlayed: number;
  historicalPointsPerAppearance: number;
  historicalStarts: number;
  historicalMinutes: number;
  teamMatchesPlayed: number;
  fixtureFactor: number;
  fixtureCount: number;
};

const PRIOR_SEASON_MATCHES = 38;
const PRODUCTIVITY_PRIOR_STRENGTH = 6;
const MAX_HISTORICAL_WEIGHT = 0.6;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const nonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

/**
 * FPL's ep_next values are deliberately conservative early in a season and
 * can sit well below a proven player's scoring rate. Blend that estimate with
 * a six-match prior plus current-season productivity, adjusted for the next
 * fixture. Usage-v2 is applied later, so a strong historical scorer who is now
 * a substitute still receives a suitably small final projection.
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
      blendedPointsPerAppearance: 0,
    };
  }

  const historicalPointsPerAppearance = nonNegative(input.historicalPointsPerAppearance);
  const currentPointsPerAppearance = nonNegative(input.currentPointsPerAppearance);
  const historicalStarts = nonNegative(input.historicalStarts);
  const historicalMinutes = nonNegative(input.historicalMinutes);
  const teamMatchesPlayed = Math.floor(nonNegative(input.teamMatchesPlayed));
  const currentMatchesPlayed = Math.min(
    teamMatchesPlayed,
    Math.floor(nonNegative(input.currentMatchesPlayed)),
  );
  const hasPriorSeasonEvidence = historicalPointsPerAppearance > 0 &&
    (historicalStarts > 0 || historicalMinutes > 0);
  const hasCurrentEvidence = currentPointsPerAppearance > 0 && currentMatchesPlayed > 0;

  if (!hasPriorSeasonEvidence && !hasCurrentEvidence) {
    return {
      points: officialExpectedPoints,
      source: 'official-ep',
      historicalWeight: 0,
      historicalFixturePoints: 0,
      blendedPointsPerAppearance: 0,
    };
  }

  const historicalFullMatchEquivalents = Math.max(historicalStarts, historicalMinutes / 90);
  const historicalEvidenceShare = hasPriorSeasonEvidence
    ? clamp(historicalFullMatchEquivalents / PRIOR_SEASON_MATCHES, 0, 1)
    : 0;
  const currentEvidenceShare = hasCurrentEvidence
    ? clamp(currentMatchesPlayed / PRODUCTIVITY_PRIOR_STRENGTH, 0, 1)
    : 0;
  const evidenceShare = Math.max(historicalEvidenceShare, currentEvidenceShare);
  const historicalWeight = MAX_HISTORICAL_WEIGHT * evidenceShare;

  const priorWeight = hasPriorSeasonEvidence ? PRODUCTIVITY_PRIOR_STRENGTH : 0;
  const currentWeight = hasCurrentEvidence ? currentMatchesPlayed : 0;
  const blendedPointsPerAppearance = (
    historicalPointsPerAppearance * priorWeight + currentPointsPerAppearance * currentWeight
  ) / Math.max(1, priorWeight + currentWeight);
  const fixtureFactor = clamp(nonNegative(input.fixtureFactor) || 1, 0.7, 1.35);
  const historicalFixturePoints = blendedPointsPerAppearance * fixtureFactor * fixtureCount;
  const points = officialExpectedPoints * (1 - historicalWeight) +
    historicalFixturePoints * historicalWeight;

  return {
    points,
    source: teamMatchesPlayed > 0 ? 'season-blend' : 'preseason-blend',
    historicalWeight,
    historicalFixturePoints,
    blendedPointsPerAppearance,
  };
}
