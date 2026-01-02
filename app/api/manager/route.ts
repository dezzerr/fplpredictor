import { NextRequest, NextResponse } from "next/server";

// Validate entryId is a valid FPL team ID (numeric, reasonable range)
function isValidEntryId(id: string | null): boolean {
  if (!id) return false;
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 && num < 100000000 && String(num) === id;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entryId = searchParams.get("entryId");

  if (!isValidEntryId(entryId)) {
    return NextResponse.json({ error: "Invalid or missing entryId" }, { status: 400 });
  }

  try {
    // Fetch manager entry data
    const entryRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${entryId}/`,
      { cache: "no-store" }
    );

    if (!entryRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch manager data" },
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
      const nextEvent = bootstrap.events?.find((e: any) => e.is_next) || 
                        bootstrap.events?.find((e: any) => e.is_current);
      currentEvent = nextEvent?.id || 1;
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
