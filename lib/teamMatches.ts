export type CompletedFixture = {
  event?: number | null;
  finished?: boolean;
  finished_provisional?: boolean;
  team_h?: number;
  team_a?: number;
};

/**
 * Count completed league matches per team from the fixture feed.
 *
 * `bootstrap-static.teams[].played` is not maintained by FPL during the
 * season, so it cannot be used as a current-season sample size. Fixture rows
 * also preserve blanks and double gameweeks correctly.
 */
export function completedTeamMatchCounts(
  fixtures: CompletedFixture[],
  completedGameweek: number,
): Map<number, number> {
  const counts = new Map<number, number>();
  if (completedGameweek <= 0) return counts;

  for (const fixture of fixtures) {
    const event = Number(fixture.event);
    if (!Number.isInteger(event) || event < 1 || event > completedGameweek) continue;
    if (!fixture.finished && !fixture.finished_provisional) continue;

    for (const teamId of [fixture.team_h, fixture.team_a]) {
      if (!Number.isInteger(teamId) || Number(teamId) <= 0) continue;
      counts.set(Number(teamId), (counts.get(Number(teamId)) || 0) + 1);
    }
  }

  return counts;
}
