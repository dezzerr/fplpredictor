import { NextResponse } from "next/server";

export const revalidate = 900; // 15 minutes

export async function GET() {
  try {
    // Use Next.js revalidation instead of no-store for build compatibility
    const res = await fetch(`https://fantasy.premierleague.com/api/bootstrap-static/`, { 
      next: { revalidate: 900 } // Revalidate every 15 minutes (matches route revalidate)
    });
    
    if (!res.ok) {
      throw new Error('Failed to fetch bootstrap data');
    }

    const data = await res.json();
    const events = data.events || [];
    const nextEvent = events.find((e: any) => e.is_next) || events.find((e: any) => e.is_current);
    
    if (nextEvent?.deadline_time) {
      return NextResponse.json({
        deadline: nextEvent.deadline_time,
        eventName: nextEvent.name || 'Gameweek',
        eventId: nextEvent.id,
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
