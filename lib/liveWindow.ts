/**
 * Determines whether the current GW is in its "live window":
 *   - Starts when the first match of the GW has kicked off
 *   - Ends 1 day after the last match's kickoff time
 *
 * Returns the current event if live, otherwise null.
 */
export async function getLiveEvent(
  events: any[]
): Promise<{ event: any; isLive: boolean } | null> {
  const current = events.find((e: any) => e.is_current);
  if (!current) return null;

  // If the event is fully finished according to FPL, check fixtures for the 1-day grace
  // If deadline hasn't passed, definitely not live yet
  const deadlinePassed = new Date(current.deadline_time) < new Date();
  if (!deadlinePassed) return null;

  // Fetch this event's fixtures to check actual kickoff times
  try {
    const res = await fetch(
      `https://fantasy.premierleague.com/api/fixtures/?event=${current.id}&t=${Date.now()}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;

    const fixtures: any[] = await res.json();
    if (fixtures.length === 0) return null;

    const now = Date.now();

    const anyStarted = fixtures.some((f: any) => f.started);
    const allFinished =
      fixtures.length > 0 &&
      fixtures.every((f: any) => f.finished || f.finished_provisional);

    if (anyStarted && !allFinished) {
      // Matches in progress or mix of finished + upcoming
      return { event: current, isLive: true };
    }

    if (allFinished) {
      // All done — stay live for 1 day after the last kickoff
      const lastKickoff = fixtures
        .filter((f: any) => f.kickoff_time)
        .map((f: any) => new Date(f.kickoff_time).getTime())
        .reduce((max: number, t: number) => Math.max(max, t), 0);
      const oneDayAfterLast = lastKickoff + 24 * 60 * 60 * 1000;
      if (now < oneDayAfterLast) {
        return { event: current, isLive: true };
      }
      return null; // Grace period expired
    }

    // No matches started yet — check if first kickoff has passed
    const firstKickoff = fixtures
      .filter((f: any) => f.kickoff_time)
      .map((f: any) => new Date(f.kickoff_time).getTime())
      .reduce((min: number, t: number) => Math.min(min, t), Infinity);

    if (now >= firstKickoff) {
      return { event: current, isLive: true };
    }

    return null; // Before first kickoff
  } catch {
    return null;
  }
}
