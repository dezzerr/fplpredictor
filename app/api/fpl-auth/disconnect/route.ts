import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      );
    }

    // Delete the FPL session
    const { error: deleteError } = await supabase
      .from('fpl_sessions')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Failed to delete FPL session:', deleteError);
      return NextResponse.json(
        { error: 'Failed to disconnect FPL account' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FPL account disconnected',
    });
  } catch (error) {
    console.error('FPL disconnect error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
