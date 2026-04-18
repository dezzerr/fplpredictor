import { NextResponse } from "next/server";

export const revalidate = 900; // 15 minutes
export const dynamic = 'force-dynamic';

function emptyHistoryPayload(error?: string) {
  return {
    lastFiveGWs: [],
    avgPoints: 0,
    homeAvg: 0,
    awayAvg: 0,
    totalPoints: 0,
    trend: 'stable' as const,
    homeGamesCount: 0,
    awayGamesCount: 0,
    seasonStats: {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      bonus: 0,
      minutes: 0,
      yellowCards: 0,
      redCards: 0,
      saves: 0,
      penaltiesSaved: 0,
      penaltiesMissed: 0,
      ownGoals: 0,
      totalPoints: 0,
      gamesPlayed: 0,
    },
    defcon: {
      points: 0,
      timesEarned: 0,
    },
    ...(error ? { error } : {}),
  };
}

// Validate playerId is numeric and reasonable
function isValidPlayerId(id: string | null): boolean {
  if (!id) return false;
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 && num < 10000 && String(num) === id;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (!isValidPlayerId(playerId)) {
      return NextResponse.json(
        { error: 'Invalid or missing playerId' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    
    // Fetch player history from FPL API
    const res = await fetch(
      `https://fantasy.premierleague.com/api/element-summary/${playerId}/?t=${timestamp}`,
      {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        emptyHistoryPayload(`Failed to fetch player history (status: ${res.status})`)
      );
    }

    const data = await res.json();
    
    // Get last 5 gameweeks of history
    const history = data.history || [];
    const lastFiveGWs = history
      .filter((game: any) => game.minutes > 0) // Only games where player played
      .slice(-5) // Get last 5 games
      .map((game: any) => ({
        gw: game.round,
        points: game.total_points,
        minutes: game.minutes,
        home: game.was_home,
        goals: game.goals_scored,
        assists: game.assists,
        bonus: game.bonus,
        cleanSheets: game.clean_sheets,
        conceded: game.goals_conceded,
        saves: game.saves || 0,
        penaltiesSaved: game.penalties_saved || 0,
        penaltiesMissed: game.penalties_missed || 0,
        yellowCards: game.yellow_cards || 0,
        redCards: game.red_cards || 0,
        ownGoals: game.own_goals || 0,
        bps: game.bps || 0,
        influence: game.influence ? parseFloat(game.influence) : 0,
        creativity: game.creativity ? parseFloat(game.creativity) : 0,
        threat: game.threat ? parseFloat(game.threat) : 0,
        ictIndex: game.ict_index ? parseFloat(game.ict_index) : 0,
        value: game.value / 10, // Convert to millions
        selected: game.selected,
        transfersIn: game.transfers_in,
        transfersOut: game.transfers_out,
      }));

    // Calculate aggregates for last 5 GWs
    const totalPoints = lastFiveGWs.reduce((sum: number, g: any) => sum + g.points, 0);
    const avgPoints = lastFiveGWs.length > 0 ? totalPoints / lastFiveGWs.length : 0;
    
    const homeGames = lastFiveGWs.filter((g: any) => g.home);
    const awayGames = lastFiveGWs.filter((g: any) => !g.home);
    
    const homeAvg = homeGames.length > 0 
      ? homeGames.reduce((sum: number, g: any) => sum + g.points, 0) / homeGames.length 
      : 0;
    const awayAvg = awayGames.length > 0
      ? awayGames.reduce((sum: number, g: any) => sum + g.points, 0) / awayGames.length
      : 0;

    // Determine trend
    let trend = 'stable';
    if (lastFiveGWs.length >= 2) {
      const recentPoints = lastFiveGWs.slice(-2).reduce((sum: number, g: any) => sum + g.points, 0) / 2;
      const olderPoints = lastFiveGWs.slice(0, -2).length > 0
        ? lastFiveGWs.slice(0, -2).reduce((sum: number, g: any) => sum + g.points, 0) / lastFiveGWs.slice(0, -2).length
        : recentPoints;
      
      if (recentPoints > olderPoints * 1.2) trend = 'up';
      else if (recentPoints < olderPoints * 0.8) trend = 'down';
    }

    // Calculate SEASON totals from full history (not just last 5)
    const seasonStats = {
      goals: history.reduce((sum: number, g: any) => sum + (g.goals_scored || 0), 0),
      assists: history.reduce((sum: number, g: any) => sum + (g.assists || 0), 0),
      cleanSheets: history.reduce((sum: number, g: any) => sum + (g.clean_sheets || 0), 0),
      bonus: history.reduce((sum: number, g: any) => sum + (g.bonus || 0), 0),
      minutes: history.reduce((sum: number, g: any) => sum + (g.minutes || 0), 0),
      yellowCards: history.reduce((sum: number, g: any) => sum + (g.yellow_cards || 0), 0),
      redCards: history.reduce((sum: number, g: any) => sum + (g.red_cards || 0), 0),
      saves: history.reduce((sum: number, g: any) => sum + (g.saves || 0), 0),
      penaltiesSaved: history.reduce((sum: number, g: any) => sum + (g.penalties_saved || 0), 0),
      penaltiesMissed: history.reduce((sum: number, g: any) => sum + (g.penalties_missed || 0), 0),
      ownGoals: history.reduce((sum: number, g: any) => sum + (g.own_goals || 0), 0),
      totalPoints: history.reduce((sum: number, g: any) => sum + (g.total_points || 0), 0),
      gamesPlayed: history.filter((g: any) => g.minutes > 0).length,
    };

    // Calculate Defcon stats from full history
    // FPL API provides: defensive_contribution (total actions per game)
    // DEF: 10 actions = 2 pts, MID/FWD: 12 actions = 2 pts
    // We need to determine position to know the threshold, but for now we'll use a general approach
    // Count games where defensive_contribution >= 10 (conservative threshold)
    const defconGames = history.filter((g: any) => {
      const dc = g.defensive_contribution || 0;
      // Use 10 as threshold (DEF threshold, MID/FWD is 12 but we'll be conservative)
      return dc >= 10;
    });
    const defcon = {
      points: defconGames.length * 2, // 2 points per Defcon earned
      timesEarned: defconGames.length,
    };

    return NextResponse.json({
      lastFiveGWs,
      avgPoints,
      homeAvg,
      awayAvg,
      totalPoints,
      trend,
      homeGamesCount: homeGames.length,
      awayGamesCount: awayGames.length,
      seasonStats,
      defcon,
    });
  } catch (error: any) {
    console.error('[PLAYER-HISTORY] Error:', error);
    return NextResponse.json(emptyHistoryPayload(error?.message || 'Failed to fetch player history'));
  }
}
