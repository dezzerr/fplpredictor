import { NextResponse } from "next/server";
import { getLiveEvent } from "@/lib/liveWindow";

export const revalidate = 900; // 15 minutes
export const dynamic = 'force-dynamic';

interface FPLTeam {
  id: number;
  name: string;
  short_name: string;
  strength: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

interface FPLFixture {
  id: number;
  event: number | null;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  finished: boolean;
  started: boolean;
}

export async function GET() {
  try {
    const timestamp = Date.now();
    
    // Fetch both bootstrap (for teams) and fixtures
    const [bootstrapRes, fixturesRes] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/bootstrap-static/?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }),
      fetch(`https://fantasy.premierleague.com/api/fixtures/?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    ]);

    if (!bootstrapRes.ok || !fixturesRes.ok) {
      throw new Error('Failed to fetch FPL data');
    }

    const bootstrap = await bootstrapRes.json();
    const allFixtures: FPLFixture[] = await fixturesRes.json();

    const teams: FPLTeam[] = bootstrap.teams || [];
    const events = bootstrap.events || [];

    // Find current/next event — prefer current when GW is in live window
    const live = await getLiveEvent(events);
    let targetEvent: number = 1;
    if (live) {
      targetEvent = live.event.id;
    } else {
      const nextEvent = events.find((e: any) => e.is_next)?.id;
      const curEv = events.find((e: any) => e.is_current)?.id;
      targetEvent = nextEvent || curEv || 1;
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[FIXTURES] Target event:', targetEvent);
    }

    // Filter upcoming fixtures (not finished)
    const upcomingFixtures = allFixtures.filter(f => !f.finished && f.event !== null);

    // Group fixtures by team
    const teamFixtures: Record<string, any[]> = {};

    teams.forEach((team: FPLTeam) => {
      const teamCode = team.short_name;
      teamFixtures[teamCode] = [];

      // Get next 8 fixtures for this team
      const relevantFixtures = upcomingFixtures
        .filter(f => f.team_h === team.id || f.team_a === team.id)
        .sort((a, b) => (a.event || 999) - (b.event || 999))
        .slice(0, 8);

      relevantFixtures.forEach(fixture => {
        const isHome = fixture.team_h === team.id;
        const opponentId = isHome ? fixture.team_a : fixture.team_h;
        const opponent = teams.find(t => t.id === opponentId);
        const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;

        if (opponent) {
          teamFixtures[teamCode].push({
            gw: fixture.event,
            opponent: opponent.short_name,
            home: isHome,
            difficulty: difficulty
          });
        }
      });
    });

    // Calculate FDR for each team
    const teamData = teams.map((team: FPLTeam) => {
      const fixtures = teamFixtures[team.short_name] || [];
      const total = fixtures.reduce((sum: number, fix: any) => sum + fix.difficulty, 0);
      const avg = fixtures.length > 0 ? total / fixtures.length : 0;

      let rating = 'Average';
      if (avg <= 2.2) rating = 'Excellent';
      else if (avg <= 2.8) rating = 'Good';
      else if (avg <= 3.5) rating = 'Average';
      else if (avg <= 4.2) rating = 'Difficult';
      else rating = 'Very Hard';

      return {
        team: team.short_name,
        fixtures: fixtures,
        fdrAvg: avg,
        fdrRating: rating
      };
    });

    return NextResponse.json({
      teams: teamData,
      currentEvent: targetEvent
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching fixtures:', error);
    }
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch fixtures' },
      { status: 500 }
    );
  }
}
