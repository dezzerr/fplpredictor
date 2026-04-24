import { NextRequest, NextResponse } from "next/server";

type FixtureStatRow = {
  element?: number;
  value?: number;
};

type FixtureStatBlock = {
  identifier?: string;
  h?: FixtureStatRow[];
  a?: FixtureStatRow[];
};

type LiveFixtureRaw = {
  id: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  started?: boolean;
  finished?: boolean;
  finished_provisional?: boolean;
  minutes?: number;
  kickoff_time?: string;
  stats?: FixtureStatBlock[];
};

type BonusDebugRow = {
  officialBonus: number;
  provisionalBonus: number;
  bonusDelta: number;
  baseTotalPoints: number;
  adjustedTotalPoints: number;
};

function allocateFixtureBonusByBps(rows: FixtureStatRow[]): Record<string, number> {
  const elementToBps = new Map<number, number>();

  for (const row of rows) {
    if (typeof row.element !== "number" || typeof row.value !== "number") continue;
    const prev = elementToBps.get(row.element);
    if (prev === undefined || row.value > prev) {
      elementToBps.set(row.element, row.value);
    }
  }

  if (elementToBps.size === 0) return {};

  const grouped = new Map<number, number[]>();
  for (const [element, bps] of elementToBps) {
    const arr = grouped.get(bps) || [];
    arr.push(element);
    grouped.set(bps, arr);
  }

  const bpsRanks = [...grouped.keys()].sort((a, b) => b - a);
  const fixtureBonus: Record<string, number> = {};

  let rank = 1;
  for (const bps of bpsRanks) {
    if (rank > 3) break;
    const elements = grouped.get(bps) || [];
    const bonusPoints = rank === 1 ? 3 : rank === 2 ? 2 : 1;

    for (const element of elements) {
      fixtureBonus[String(element)] = bonusPoints;
    }

    rank += elements.length;
  }

  return fixtureBonus;
}

function computeProvisionalBonusByPlayer(fixtures: LiveFixtureRaw[]): Record<string, number> {
  const bonusByPlayer: Record<string, number> = {};

  for (const fixture of fixtures) {
    if (!fixture.started) continue;
    const statBlocks = Array.isArray(fixture.stats) ? fixture.stats : [];
    const bps = statBlocks.find((s) => s?.identifier === "bps");
    if (!bps) continue;

    const rows = [
      ...(Array.isArray(bps.h) ? bps.h : []),
      ...(Array.isArray(bps.a) ? bps.a : []),
    ];

    const fixtureBonus = allocateFixtureBonusByBps(rows);
    for (const [playerId, bonus] of Object.entries(fixtureBonus)) {
      bonusByPlayer[playerId] = (bonusByPlayer[playerId] || 0) + bonus;
    }
  }

  return bonusByPlayer;
}

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/live?entryId=123
 *
 * Returns live gameweek data:
 * - isLive: whether the current GW is in progress
 * - eventId: the live event number
 * - livePoints: Record<elementId, totalPoints> for every player (incl. provisional bonus)
 * - managerLive: { points, rank } for the user's entry (if entryId given)
 * - fixtures: summary of live/finished/upcoming matches this GW
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");
    const debugBonusParam = searchParams.get("debugBonus");
    const debugBonus =
      process.env.NODE_ENV === "development" &&
      (debugBonusParam === "1" || debugBonusParam?.toLowerCase() === "true");

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
    let rawFixtures: LiveFixtureRaw[] = [];
    const teams: any[] = bootstrap.teams || [];
    const teamName: Record<number, string> = {};
    for (const t of teams) teamName[t.id] = t.short_name;

    if (fixturesRes?.ok) {
      rawFixtures = await fixturesRes.json();
      fixtures = rawFixtures.map((fx: LiveFixtureRaw) => ({
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

    const provisionalBonusByPlayer = computeProvisionalBonusByPlayer(rawFixtures);

    // Determine isLive from actual fixture times:
    // - Starts when the first match of the GW has kicked off
    // - Ends as soon as all matches are finished/provisional-finished
    const now = new Date();
    const anyStarted = fixtures.some((f: any) => f.started);
    const allFinished = fixtures.length > 0 && fixtures.every((f: any) => f.finished || f.finishedProvisional);

    let isLive = false;
    if (anyStarted && !allFinished) {
      // Matches in progress or mix of finished + upcoming
      isLive = true;
    } else if (!allFinished && fixtures.length > 0) {
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
        ...(debugBonus
          ? {
              debug: {
                bonusByPlayer: {},
                note: "debugBonus is enabled, but this event is not live",
              },
            }
          : {}),
      });
    }

    // Build live points map
    const livePoints: Record<string, number> = {};
    const bonusByPlayerDebug: Record<string, BonusDebugRow> = {};
    if (liveRes?.ok) {
      const liveData = await liveRes.json();
      const elements: any[] = liveData.elements || [];
      for (const el of elements) {
        if (typeof el.id === "number" && el.stats) {
          const playerId = String(el.id);
          const totalPointsRaw = Number(el.stats.total_points ?? 0);
          const officialBonusRaw = Number(el.stats.bonus ?? 0);

          const totalPoints = Number.isFinite(totalPointsRaw) ? totalPointsRaw : 0;
          const officialBonus = Number.isFinite(officialBonusRaw)
            ? Math.max(0, officialBonusRaw)
            : 0;

          const provisionalBonus = provisionalBonusByPlayer[playerId] ?? 0;
          const bonusDelta = Math.max(0, provisionalBonus - officialBonus);
          const adjustedTotalPoints = totalPoints + bonusDelta;

          livePoints[playerId] = adjustedTotalPoints;

          if (
            debugBonus &&
            (officialBonus > 0 || provisionalBonus > 0 || bonusDelta > 0)
          ) {
            bonusByPlayerDebug[playerId] = {
              officialBonus,
              provisionalBonus,
              bonusDelta,
              baseTotalPoints: totalPoints,
              adjustedTotalPoints,
            };
          }
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
            const multiplierRaw = Number(pk.multiplier);
            const multiplier = Number.isFinite(multiplierRaw) ? multiplierRaw : 1;
            liveTotal += pts * multiplier;
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
      ...(debugBonus ? { debug: { bonusByPlayer: bonusByPlayerDebug } } : {}),
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
