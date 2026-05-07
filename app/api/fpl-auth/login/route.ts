import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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
    console.log('[FPL-AUTH] Validating FPL Team ID:', id);
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

    console.log('[FPL-AUTH] Verified team:', { id, teamName, playerName });

    // Get the authenticated Supabase user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // If user is logged in, store the connection in database
    if (user) {
      // No expiry needed — Team ID connections don't expire
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10); // Effectively permanent

      // Store the FPL session in the database
      const { error: upsertError } = await supabase
        .from('fpl_sessions')
        .upsert({
          user_id: user.id,
          manager_id: id,
          encrypted_cookies: '', // No cookies needed for Team ID flow
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (upsertError) {
        console.error('Failed to store FPL session:', upsertError);
      }

      // Also update the profile with the FPL team ID
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
      message: `Successfully connected to ${teamName}!`,
    });
  } catch (error) {
    console.error('FPL connect error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
