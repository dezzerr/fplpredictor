import { NextResponse } from "next/server";

export const revalidate = 900; // 15 minutes
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json(
        { error: 'playerId is required' },
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
      throw new Error(`Failed to fetch player history (status: ${res.status})`);
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

    // Calculate aggregates
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

    return NextResponse.json({
      lastFiveGWs,
      avgPoints,
      homeAvg,
      awayAvg,
      totalPoints,
      trend,
      homeGamesCount: homeGames.length,
      awayGamesCount: awayGames.length,
    });
  } catch (error: any) {
    console.error('[PLAYER-HISTORY] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch player history' },
      { status: 500 }
    );
  }
}
