import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

interface LeagueTeam {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  total: number;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leagueId = url.searchParams.get("leagueId");
    const searchTerm = url.searchParams.get("search")?.toLowerCase() || "";
    
    if (!leagueId) {
      return NextResponse.json({ error: "Missing leagueId" }, { status: 400 });
    }

    // Fetch league standings from FPL API
    const leagueUrl = `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`;
    const response = await fetch(leagueUrl, { 
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ 
          error: "League not found. Please check the league ID." 
        }, { status: 404 });
      }
      throw new Error("Failed to fetch league data");
    }

    const data = await response.json();
    const standings = data.standings?.results || [];

    // Filter teams based on search term (team name or manager name)
    const filteredTeams = standings
      .filter((team: LeagueTeam) => {
        if (!searchTerm) return true;
        const teamNameMatch = team.entry_name.toLowerCase().includes(searchTerm);
        const managerNameMatch = team.player_name.toLowerCase().includes(searchTerm);
        return teamNameMatch || managerNameMatch;
      })
      .slice(0, 50) // Limit to 50 results
      .map((team: LeagueTeam) => ({
        entryId: team.entry,
        teamName: team.entry_name,
        managerName: team.player_name,
        rank: team.rank,
        points: team.total,
      }));

    return NextResponse.json({
      teams: filteredTeams,
      leagueName: data.league?.name || "League",
    });
  } catch (e: any) {
    console.error('[LEAGUE-SEARCH] Error:', e?.message || e);
    return NextResponse.json({ 
      error: e?.message || "Failed to search league" 
    }, { status: 500 });
  }
}
