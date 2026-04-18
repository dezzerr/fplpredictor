import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/live?entryId=123
 *
 * Returns live gameweek data:
 * - isLive: whether the current GW is in progress
 * - eventId: the live event number
 * - livePoints: Record<elementId, totalPoints> for every player
 * - managerLive: { points, rank } for the user's entry (if entryId given)
 * - fixtures: summary of live/finished/upcoming matches this GW
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    const timestamp = Date.now();

    // 1. Bootstrap to detect current event status
    let bootstrap: any;
    try {
      const bootstrapRes = await fetch(
        `https://fantasy.premierleague.com/api/bootstrap-static/?t=${timestamp}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );

      if (!bootstrapRes.ok) throw new Error(`Bootstrap fetch failed (${bootstrapRes.status})`);
      bootstrap = await bootstrapRes.json();
    } catch (bootstrapError: any) {
      return NextResponse.json({
        isLive: false,
        eventId: null,
        eventName: null,
        livePoints: {},
        managerLive: null,
        fixtures: [],
        error: bootstrapError?.message || "Failed to fetch bootstrap",
      });
    }

    const events: any[] = bootstrap.events || [];

    // Find the current (live) event
    const currentEvent = events.find((e: any) => e.is_current);
    if (!currentEvent) {
      return NextResponse.json({ isLive: false, eventId: null, livePoints: {}, fixtures: [] });
    }

    const eventId: number = currentEvent.id;

    // 2. Fetch fixtures + live data for this event
    const [liveResSettled, fixturesResSettled] = await Promise.allSettled([
      fetch(`https://fantasy.premierleague.com/api/event/${eventId}/live/`, {
        cache: "no-store",
      }),
      fetch(
        `https://fantasy.premierleague.com/api/fixtures/?event=${eventId}&t=${timestamp}`,
        { cache: "no-store" }
      ),
    ]);
    const liveRes = liveResSettled.status === "fulfilled" ? liveResSettled.value : null;
    const fixturesRes = fixturesResSettled.status === "fulfilled" ? fixturesResSettled.value : null;

    // Build fixture summaries
    let fixtures: any[] = [];
    const teams: any[] = bootstrap.teams || [];
    const teamName: Record<number, string> = {};
    for (const t of teams) teamName[t.id] = t.short_name;

    if (fixturesRes?.ok) {
      const raw: any[] = await fixturesRes.json();
      fixtures = raw.map((fx: any) => ({
        id: fx.id,
        home: teamName[fx.team_h] || "?",
        away: teamName[fx.team_a] || "?",
        homeScore: fx.team_h_score,
        awayScore: fx.team_a_score,
        started: fx.started ?? false,
        finished: fx.finished ?? false,
        finishedProvisional: fx.finished_provisional ?? false,
        minutes: fx.minutes ?? 0,
        kickoff: fx.kickoff_time,
      }));
    }

    // Determine isLive from actual fixture times:
    // - Starts when the first match of the GW has kicked off
    // - Ends 1 day after the last match finished
    const now = new Date();
    const anyStarted = fixtures.some((f: any) => f.started);
    const allFinished = fixtures.length > 0 && fixtures.every((f: any) => f.finished || f.finishedProvisional);

    let isLive = false;
    if (anyStarted && !allFinished) {
      // Matches in progress or mix of finished + upcoming
      isLive = true;
    } else if (allFinished) {
      // All done — stay live for 1 day after the last kickoff (approx end of last match)
      const lastKickoff = fixtures
        .filter((f: any) => f.kickoff)
        .map((f: any) => new Date(f.kickoff).getTime())
        .reduce((max: number, t: number) => Math.max(max, t), 0);
      const oneDayAfterLast = lastKickoff + 24 * 60 * 60 * 1000;
      isLive = now.getTime() < oneDayAfterLast;
    } else if (fixtures.length > 0) {
      // No matches started yet — check if first kickoff has passed
      const firstKickoff = fixtures
        .filter((f: any) => f.kickoff)
        .map((f: any) => new Date(f.kickoff).getTime())
        .reduce((min: number, t: number) => Math.min(min, t), Infinity);
      isLive = now.getTime() >= firstKickoff;
    }

    if (!isLive) {
      return NextResponse.json({
        isLive: false,
        eventId,
        livePoints: {},
        fixtures,
      });
    }

    // Build live points map
    const livePoints: Record<string, number> = {};
    if (liveRes?.ok) {
      const liveData = await liveRes.json();
      const elements: any[] = liveData.elements || [];
      for (const el of elements) {
        if (typeof el.id === "number" && el.stats) {
          livePoints[String(el.id)] = el.stats.total_points ?? 0;
        }
      }
    }

    // 3. If entryId provided, fetch manager's live picks & points
    let managerLive: { points: number; activeChip: string | null; picks: any[] } | null = null;
    if (entryId && /^\d+$/.test(entryId)) {
      try {
        const picksRes = await fetch(
          `https://fantasy.premierleague.com/api/entry/${entryId}/event/${eventId}/picks/`,
          { cache: "no-store" }
        );
        if (picksRes.ok) {
          const picksData = await picksRes.json();
          const picks = (picksData.picks || []).map((pk: any) => ({
            element: pk.element,
            position: pk.position,
            isCaptain: pk.is_captain,
            isViceCaptain: pk.is_vice_captain,
            multiplier: pk.multiplier,
          }));

          // Calculate live total from picks × live points
          let liveTotal = 0;
          for (const pk of picks) {
            const pts = livePoints[String(pk.element)] ?? 0;
            liveTotal += pts * (pk.multiplier || 1);
          }

          managerLive = {
            points: liveTotal,
            activeChip: picksData.active_chip || null,
            picks,
          };
        }
      } catch (e) {
        // Non-critical, continue without manager data
      }
    }

    return NextResponse.json({
      isLive: true,
      eventId,
      eventName: currentEvent.name || `Gameweek ${eventId}`,
      livePoints,
      managerLive,
      fixtures,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("[LIVE] Error:", error);
    }
    return NextResponse.json(
      {
        isLive: false,
        eventId: null,
        eventName: null,
        livePoints: {},
        managerLive: null,
        fixtures: [],
        error: error?.message || "Failed to fetch live data",
      }
    );
  }
}
