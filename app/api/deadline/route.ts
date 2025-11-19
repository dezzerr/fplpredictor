import { NextResponse } from "next/server";

// This route is cheap and needs to be accurate, so we disable caching and
// mirror the bootstrap fetch pattern used in lib/fpl.ts
export const revalidate = 0;

export async function GET() {
  try {
    // Match fetchFplPlayers: force fresh bootstrap using a timestamp and no-store
    const timestamp = Date.now();
    const res = await fetch(`https://fantasy.premierleague.com/api/bootstrap-static/?t=${timestamp}`, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch bootstrap data');
    }

    const data = await res.json();
    const events = data.events || [];

    // Mirror the event selection logic from lib/fpl.ts so all parts of the app
    // agree on what the "current" gameweek is.
    const nextEvent =
      events.find((e: any) => e.is_next) ||
      events.find((e: any) => e.is_current) ||
      events.find((e: any) => !e.finished);

    const targetEvent = nextEvent || events[0];

    if (targetEvent?.deadline_time) {
      return NextResponse.json({
        deadline: targetEvent.deadline_time,
        eventName: targetEvent.name || 'Gameweek',
        eventId: targetEvent.id ?? null,
      });
    }

    // Fallback: return mock deadline
    const mockDeadline = new Date();
    const day = mockDeadline.getDay();
    const daysUntilFri = (5 - day + 7) % 7 || 7;
    mockDeadline.setDate(mockDeadline.getDate() + daysUntilFri);
    mockDeadline.setHours(18, 30, 0, 0);

    return NextResponse.json({
      deadline: mockDeadline.toISOString(),
      eventName: 'Gameweek',
      eventId: null,
    });
  } catch (error: any) {
    console.error('Error fetching deadline:', error);
    
    // Return mock deadline on error
    const mockDeadline = new Date();
    const day = mockDeadline.getDay();
    const daysUntilFri = (5 - day + 7) % 7 || 7;
    mockDeadline.setDate(mockDeadline.getDate() + daysUntilFri);
    mockDeadline.setHours(18, 30, 0, 0);

    return NextResponse.json({
      deadline: mockDeadline.toISOString(),
      eventName: 'Gameweek',
      eventId: null,
    });
  }
}
