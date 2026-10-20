import { seasonKeyFromEvents } from '@/lib/fplSeason';
import { completedTeamMatchCounts, type CompletedFixture } from '@/lib/teamMatches';

type RawEvent = {
  id?: number;
  finished?: boolean;
  deadline_time?: string | null;
};

type RawTeam = {
  id?: number;
  short_name?: string;
  played?: number;
};

type RawElement = {
  id?: number;
  team?: number;
  starts?: number | string;
  minutes?: number | string;
  total_points?: number | string;
  points_per_game?: number | string;
};

export type PlayerUsageCaptureRow = {
  season_key: string;
  completed_gameweek: number;
  player_id: string;
  team: string;
  team_matches_played: number;
  starts_total: number;
  minutes_total: number;
  total_points: number;
  points_per_appearance: number;
  captured_at: string;
};

export type UsageCaptureResult = {
  seasonKey: string;
  completedGameweek: number;
  rows: PlayerUsageCaptureRow[];
  skipReason?: string;
};

const nonNegativeInt = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
};

const nonNegativeNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

/** Build an idempotent, fully-completed-GW snapshot from the official feed. */
export function buildPlayerUsageCapture(
  bootstrap: { events?: RawEvent[]; teams?: RawTeam[]; elements?: RawElement[] },
  fixtures: CompletedFixture[] = [],
  now = new Date(),
): UsageCaptureResult {
  const events = Array.isArray(bootstrap.events) ? bootstrap.events : [];
  const seasonKey = seasonKeyFromEvents(events);
  const completedGameweek = events
    .filter((event) => event.finished && typeof event.id === 'number')
    .reduce((latest, event) => Math.max(latest, event.id || 0), 0);
  const incompleteStartedEvent = events.some((event) => {
    if (event.finished || typeof event.id !== 'number' || event.id <= completedGameweek) return false;
    const deadline = event.deadline_time ? new Date(event.deadline_time).getTime() : Number.POSITIVE_INFINITY;
    return Number.isFinite(deadline) && deadline <= now.getTime();
  });

  if (seasonKey === 'unknown') {
    return { seasonKey, completedGameweek, rows: [], skipReason: 'season_key_unavailable' };
  }
  if (incompleteStartedEvent) {
    return { seasonKey, completedGameweek, rows: [], skipReason: 'gameweek_incomplete' };
  }

  const teams = new Map(
    (Array.isArray(bootstrap.teams) ? bootstrap.teams : [])
      .filter((team): team is RawTeam & { id: number; short_name: string } =>
        typeof team.id === 'number' && typeof team.short_name === 'string'
      )
      .map((team) => [team.id, team]),
  );
  const fixtureMatchCounts = completedTeamMatchCounts(fixtures, completedGameweek);
  const hasCompletedFixtureData = completedGameweek === 0 || fixtures.some((fixture) =>
    Number(fixture.event) <= completedGameweek && (fixture.finished || fixture.finished_provisional)
  );
  const capturedAt = now.toISOString();
  const rows = (Array.isArray(bootstrap.elements) ? bootstrap.elements : [])
    .filter((element) => typeof element.id === 'number' && typeof element.team === 'number' && teams.has(element.team))
    .map((element) => {
      const team = teams.get(element.team!)!;
      return {
        season_key: seasonKey,
        completed_gameweek: completedGameweek,
        player_id: String(element.id),
        team: team.short_name,
        team_matches_played: hasCompletedFixtureData
          ? fixtureMatchCounts.get(team.id) || 0
          : nonNegativeInt(team.played),
        starts_total: nonNegativeInt(element.starts),
        minutes_total: nonNegativeInt(element.minutes),
        total_points: nonNegativeInt(element.total_points),
        points_per_appearance: nonNegativeNumber(element.points_per_game),
        captured_at: capturedAt,
      };
    });

  return { seasonKey, completedGameweek, rows };
}
