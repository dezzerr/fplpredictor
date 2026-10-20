import { NextRequest, NextResponse } from "next/server";
import { getLiveEvent } from "@/lib/liveWindow";
import { rateLimitGuard } from "@/lib/request-security";
import { parseFplEntryId } from "@/lib/fplEntry";

export async function GET(req: NextRequest) {
  const protection = await rateLimitGuard(req, "manager", 30, 60_000);
  if (protection) return protection;

  const { searchParams } = new URL(req.url);
  const entryId = parseFplEntryId(searchParams.get("entryId"));

  if (!entryId) {
    return NextResponse.json({ error: "Enter a valid FPL Team ID or official entry URL." }, { status: 400 });
  }

  try {
    // Fetch manager entry data
    const entryRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/`,
      { cache: "no-store" }
    );

    if (!entryRes.ok) {
      return NextResponse.json(
        { error: entryRes.status === 404 ? "FPL team not found. Check the Team ID or entry URL." : "Could not verify this FPL team right now." },
        { status: entryRes.status }
      );
    }

    const entryData = await entryRes.json();

    // Fetch bootstrap for total players count
    const bootstrapRes = await fetch(
      "https://fantasy.premierleague.com/api/bootstrap-static/",
      { cache: "no-store" }
    );
    
    let totalPlayers = 0;
    let currentEvent = 1;
    
    if (bootstrapRes.ok) {
      const bootstrap = await bootstrapRes.json();
      totalPlayers = bootstrap.total_players || 0;
      const evts = bootstrap.events || [];
      // When a GW is in its live window, use current event so GW points match
      const live = await getLiveEvent(evts);
      let targetEv: any = null;
      if (live) {
        targetEv = live.event;
      }
      if (!targetEv) {
        targetEv = evts.find((e: any) => e.is_next) || evts.find((e: any) => e.is_current);
      }
      currentEvent = targetEv?.id || 1;
    }

    // Fetch current gameweek history for GW points
    let gwPoints = 0;
    try {
      const historyRes = await fetch(
        `https://fantasy.premierleague.com/api/entry/${entryId}/history/`,
        { cache: "no-store" }
      );
      if (historyRes.ok) {
        const history = await historyRes.json();
        const currentGw = history.current?.find((gw: any) => gw.event === currentEvent);
        gwPoints = currentGw?.points || 0;
      }
    } catch (e) {
      console.warn("Failed to fetch GW history:", e);
    }

    // Format classic leagues with movement indicators
    const classicLeagues = (entryData.leagues?.classic || [])
      .filter((league: any) => league.league_type === "x") // Classic leagues only
      .map((league: any) => ({
        id: league.id,
        name: league.name,
        rank: league.entry_rank,
        lastRank: league.entry_last_rank,
        movement: getMovement(league.entry_rank, league.entry_last_rank),
      }))
      .slice(0, 10); // Limit to 10 leagues

    return NextResponse.json({
      teamName: entryData.name,
      playerName: `${entryData.player_first_name} ${entryData.player_last_name}`,
      region: entryData.player_region_name,
      regionIso: entryData.player_region_iso_code_short,
      overallPoints: entryData.summary_overall_points,
      overallRank: entryData.summary_overall_rank,
      totalPlayers,
      gwPoints,
      currentEvent,
      classicLeagues,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Manager API error:", error);
    }
    return NextResponse.json(
      { error: "Failed to fetch manager data" },
      { status: 500 }
    );
  }
}

function getMovement(current: number, last: number): "up" | "down" | "same" {
  if (!last || current === last) return "same";
  return current < last ? "up" : "down";
}
