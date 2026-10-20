import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { protectRequest } from '@/lib/request-security';

export async function POST(request: NextRequest) {
  const protection = await protectRequest(request, 'fpl-auth-legacy-login', 30, 60_000);
  if (protection) return protection;

  try {
    const { teamId } = await request.json();

    // Validate input
    const id = parseInt(teamId, 10);
    if (!teamId || isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'A valid FPL Team ID is required' },
        { status: 400 }
      );
    }

    // Validate the team ID exists via the public FPL API
    console.log('[FPL-IMPORT] Validating FPL Team ID:', id);
    const entryRes = await fetch(
      `https://fantasy.premierleague.com/api/entry/${id}/`,
      { cache: 'no-store' }
    );

    if (!entryRes.ok) {
      if (entryRes.status === 404) {
        return NextResponse.json(
          { error: `FPL Team ID ${id} not found. Please check your ID and try again.` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Could not verify Team ID with FPL. Please try again later.' },
        { status: 502 }
      );
    }

    const entryData = await entryRes.json();
    const teamName = entryData.name || 'Unknown Team';
    const playerName = `${entryData.player_first_name || ''} ${entryData.player_last_name || ''}`.trim();

    console.log('[FPL-IMPORT] Verified team:', { id, teamName, playerName });

    // Get the authenticated Supabase user
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // If user is logged in, store the public Team ID on their profile.
    // This route only supports public Team ID imports; it never creates an FPL session.
    if (user) {
      await supabase
        .from('profiles')
        .update({ fpl_team_id: id })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      managerId: id,
      teamName,
      playerName,
      message: `Successfully imported ${teamName}!`,
    });
  } catch (error) {
    console.error('FPL Team ID import error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
