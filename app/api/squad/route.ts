import { NextResponse } from "next/server";
import { fetchPlayersWithMarket } from "@/lib/market";
import { getLiveEvent } from "@/lib/liveWindow";
import type { Player, Position, Squad } from "@/lib/data";

export const revalidate = 0; // Always fetch fresh data for imports
export const dynamic = 'force-dynamic'; // Disable all caching

type PicksResponse = {
  picks?: Array<{
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  entry_history?: {
    bank?: number;
  };
  active_chip?: string | null;
};

async function pickEventId(events: any[]): Promise<number | undefined> {
  // When a GW is in its live window, load the current event's squad so it matches live points
  // load the current event's squad so it matches live points
  const live = await getLiveEvent(events);
  if (live) return live.event.id;
  const next = events.find((e: any) => e.is_next);
  if (next) return next.id;
  const current = events.find((e: any) => e.is_current);
  if (current) return current.id;
  const upcoming = events.find((e: any) => !e.finished);
  return upcoming?.id;
}

// Validate entryId is a valid FPL team ID (numeric, reasonable range)
function isValidEntryId(id: string | null): boolean {
  if (!id) return false;
  const num = parseInt(id, 10);
  return !isNaN(num) && num > 0 && num < 100000000 && String(num) === id;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const entryId = url.searchParams.get("entryId");
    const preset = url.searchParams.get("preset");
    
    if (!isValidEntryId(entryId)) {
      return NextResponse.json({ error: "Invalid or missing entryId" }, { status: 400 });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[IMPORT] Importing squad for entry:', entryId, 'preset:', preset);
    }

    // Load bootstrap (for event id) and player universe (with calibrated EP and current prices)
    // Use cache: 'no-store' + timestamp to force fresh data from FPL API
    const timestamp = Date.now();
    const [bootstrapRes, players] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/bootstrap-static/?t=${timestamp}`, { 
        cache: 'no-store',
        headers: { 
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }),
      fetchPlayersWithMarket(preset),
    ]);
    if (!bootstrapRes.ok) throw new Error("Failed to load FPL bootstrap");
    const bootstrap = await bootstrapRes.json();
    const events: any[] = bootstrap.events || [];
    const eventId: number | undefined = await pickEventId(events);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[IMPORT] Detected event ID:', eventId, 'from events:', events.map((e: any) => ({ id: e.id, name: e.name, is_current: e.is_current, is_next: e.is_next, finished: e.finished })));
    }
    
    if (!eventId) throw new Error("Could not determine current/next event");

    const currentEventId = events.find((e: any) => e.is_current)?.id as number | undefined;

    const fetchPicksForEvent = async (targetEventId: number) => {
      const picksUrl = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${targetEventId}/picks/`;
      if (process.env.NODE_ENV === 'development') {
        console.log('[IMPORT] Fetching picks from:', picksUrl);
      }

      const res = await fetch(picksUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });

      if (!res.ok) {
        return {
          ok: false as const,
          status: res.status,
          eventId: targetEventId,
          data: null,
        };
      }

      const data = (await res.json()) as PicksResponse;
      return {
        ok: true as const,
        status: res.status,
        eventId: targetEventId,
        data,
      };
    };

    // Try to load the picks for the chosen event
    const attempts: Array<{ eventId: number; status: number }> = [];

    let resolvedEventId = eventId;
    let picksJson: PicksResponse | null = null;

    const primaryAttempt = await fetchPicksForEvent(eventId);
    attempts.push({ eventId: primaryAttempt.eventId, status: primaryAttempt.status });

    if (primaryAttempt.ok) {
      picksJson = primaryAttempt.data;
    } else if (currentEventId && currentEventId !== eventId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[IMPORT] First attempt failed (status:', primaryAttempt.status, '), trying current event:', currentEventId);
      }

      const currentAttempt = await fetchPicksForEvent(currentEventId);
      attempts.push({ eventId: currentAttempt.eventId, status: currentAttempt.status });

      if (currentAttempt.ok) {
        const currentActiveChip = String(currentAttempt.data?.active_chip || '').toLowerCase();

        // Free Hit reverts to previous squad after the GW ends.
        // If next-GW picks are not yet available and current GW used FH,
        // prefer previous event picks rather than keeping the FH squad.
        if (currentActiveChip === 'freehit' && currentEventId > 1) {
          const previousEventId = currentEventId - 1;
          if (process.env.NODE_ENV === 'development') {
            console.log('[IMPORT] Current GW used Free Hit; attempting previous event for reverted squad:', previousEventId);
          }

          const previousAttempt = await fetchPicksForEvent(previousEventId);
          attempts.push({ eventId: previousAttempt.eventId, status: previousAttempt.status });

          if (previousAttempt.ok) {
            picksJson = previousAttempt.data;
            resolvedEventId = previousEventId;
          } else {
            picksJson = currentAttempt.data;
            resolvedEventId = currentEventId;
          }
        } else {
          picksJson = currentAttempt.data;
          resolvedEventId = currentEventId;
        }
      }
    }

    if (!picksJson) {
      const latestStatus = attempts[attempts.length - 1]?.status || 500;
      console.error('[IMPORT] Failed to load picks. Attempts:', attempts);
      const msg = latestStatus === 404 
        ? `FPL team ${entryId} not found or no picks available for GW${eventId}. Make sure your team ID is correct and you have made picks for this gameweek.` 
        : "Failed to load entry picks";
      return NextResponse.json(
        { error: msg, details: { entryId, eventId, attempts } },
        { status: latestStatus }
      );
    }

    const picks: Array<{ element: number; position: number; is_captain: boolean; is_vice_captain: boolean }> = picksJson.picks || [];
    const entryHistory = picksJson.entry_history || {};
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[IMPORT] Successfully loaded', picks.length, 'picks for entry', entryId, 'using event', resolvedEventId, 'active_chip:', picksJson.active_chip || null);
    }

    // Map of id -> Player
    const byId: Record<string, Player> = Object.fromEntries(players.map((p) => [p.id, p]));

    // Build Squad
    const s: Squad = {
      bank: typeof entryHistory.bank === "number" ? Number((entryHistory.bank / 10).toFixed(1)) : 0,
      starters: { GK: [], DEF: [], MID: [], FWD: [] },
      bench: [],
      captainId: undefined,
      viceId: undefined,
    };

    // starters by position <= 11, keep formation by pushing into position groups
    const starters = picks
      .filter((pk) => (pk.position ?? 0) > 0 && pk.position <= 11)
      .sort((a, b) => a.position - b.position);

    for (const pk of starters) {
      const pl = byId[String(pk.element)];
      if (!pl) continue;
      s.starters[pl.position as Position].push(pl);
      if (pk.is_captain) s.captainId = pl.id;
      if (pk.is_vice_captain) s.viceId = pl.id;
    }

    // bench: positions > 11; ensure GK is first
    const bench = picks
      .filter((pk) => (pk.position ?? 0) > 11)
      .sort((a, b) => a.position - b.position)
      .map((pk) => byId[String(pk.element)])
      .filter((p): p is Player => !!p);

    const benchGkIdx = bench.findIndex((p) => p.position === "GK");
    if (benchGkIdx > -1) {
      s.bench = [bench[benchGkIdx], ...bench.filter((_, i) => i !== benchGkIdx)];
    } else {
      s.bench = bench;
    }

    const totalStarters = Object.values(s.starters).flat().length;
    if (process.env.NODE_ENV === 'development') {
      console.log('[IMPORT] Successfully built squad with', totalStarters, 'starters and', s.bench.length, 'bench players. Bank:', s.bank);
      console.log('[IMPORT] Captain:', s.captainId, 'Vice:', s.viceId);
      console.log('[IMPORT] Sample starters:', Object.values(s.starters).flat().slice(0, 3).map(p => p.name));
    }

    return NextResponse.json(s, {
      headers: {
        "Cache-Control": "s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    console.error('[IMPORT] Import failed with error:', e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to import squad" }, { status: 500 });
  }
}
