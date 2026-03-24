import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

/**
 * GET /api/live-leagues?entryId=123
 *
 * Fetches live league standings for a manager's classic leagues.
 * Returns each league with the manager's current rank and live points context.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get("entryId");

    if (!entryId || !/^\d+$/.test(entryId)) {
      return NextResponse.json({ error: "Invalid entryId" }, { status: 400 });
    }

    // Fetch manager entry to get league list
    const entryRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/`,
      { cache: "no-store" }
    );

    if (!entryRes.ok) {
      return NextResponse.json({ error: "Failed to fetch entry" }, { status: entryRes.status });
    }

    const entryData = await entryRes.json();
    const classicLeagues: any[] = (entryData.leagues?.classic || [])
      .filter((l: any) => l.league_type === "x")
      .slice(0, 8); // Limit to 8 leagues to avoid too many requests

    // Fetch standings for each league in parallel
    const leagueResults = await Promise.allSettled(
      classicLeagues.map(async (league: any) => {
        const standingsRes = await fetch(
          `https://fantasy.premierleague.com/api/leagues-classic/${league.id}/standings/?page_standings=1`,
          { cache: "no-store" }
        );

        if (!standingsRes.ok) {
          return {
            id: league.id,
            name: league.name,
            rank: league.entry_rank,
            lastRank: league.entry_last_rank,
            movement: getMovement(league.entry_rank, league.entry_last_rank),
            liveRank: null,
            entries: [],
          };
        }

        const standingsData = await standingsRes.json();
        const results: any[] = standingsData.standings?.results || [];

        // Find manager's position in standings
        const managerEntry = results.find((r: any) => r.entry === parseInt(entryId));
        const liveRank = managerEntry?.rank ?? league.entry_rank;

        // Top entries for context
        const entries = results.slice(0, 5).map((r: any) => ({
          entry: r.entry,
          playerName: r.player_name,
          teamName: r.entry_name,
          rank: r.rank,
          lastRank: r.last_rank,
          total: r.total,
          eventTotal: r.event_total,
          isManager: r.entry === parseInt(entryId),
        }));

        return {
          id: league.id,
          name: league.name,
          rank: liveRank,
          lastRank: league.entry_last_rank,
          movement: getMovement(liveRank, league.entry_last_rank),
          liveRank,
          entries,
        };
      })
    );

    const leagues = leagueResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    return NextResponse.json({ leagues });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("[LIVE-LEAGUES] Error:", error);
    }
    return NextResponse.json(
      { error: error?.message || "Failed to fetch league data" },
      { status: 500 }
    );
  }
}

function getMovement(current: number, last: number): "up" | "down" | "same" {
  if (!last || !current || current === last) return "same";
  return current < last ? "up" : "down";
}
