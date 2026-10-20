/**
 * FPL Authentication utilities
 * Uses public FPL API with Team ID — no credentials needed.
 */

export interface FPLTeamValidationResult {
  success: boolean;
  error?: string;
  managerId?: number;
  teamName?: string;
  playerName?: string;
}

/**
 * Validate an FPL Team ID via the public API.
 * Returns team info if the ID is valid.
 */
export async function validateFPLTeamId(
  teamId: number
): Promise<FPLTeamValidationResult> {
  try {
    const response = await fetch(
      `https://fantasy.premierleague.com/api/entry/${teamId}/`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: `FPL Team ID ${teamId} not found. Please check your ID and try again.`,
        };
      }
      return {
        success: false,
        error: 'Could not verify Team ID with FPL. Please try again later.',
      };
    }

    const data = await response.json();
    return {
      success: true,
      managerId: teamId,
      teamName: data.name || 'Unknown Team',
      playerName: `${data.player_first_name || ''} ${data.player_last_name || ''}`.trim(),
    };
  } catch (error) {
    console.error('FPL team validation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
