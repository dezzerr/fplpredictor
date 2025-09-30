import { NextResponse } from "next/server";
import { fetchPlayersWithMarket } from "@/lib/market";
import type { Player, Position, Squad } from "@/lib/data";

export const revalidate = 0; // Always fetch fresh data for imports
export const dynamic = 'force-dynamic'; // Disable all caching

function pickEventId(events: any[]): number | undefined {
  const next = events.find((e: any) => e.is_next);
  if (next) return next.id;
  const current = events.find((e: any) => e.is_current);
  if (current) return current.id;
  const upcoming = events.find((e: any) => !e.finished);
  return upcoming?.id;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const entryId = url.searchParams.get("entryId");
    const preset = url.searchParams.get("preset");
    if (!entryId) return NextResponse.json({ error: "Missing entryId" }, { status: 400 });

    console.log('[IMPORT] Importing squad for entry:', entryId, 'preset:', preset);

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
    const eventId: number | undefined = pickEventId(events);
    
    console.log('[IMPORT] Detected event ID:', eventId, 'from events:', events.map((e: any) => ({ id: e.id, name: e.name, is_current: e.is_current, is_next: e.is_next, finished: e.finished })));
    
    if (!eventId) throw new Error("Could not determine current/next event");

    // Try to load the picks for the chosen event
    const picksUrl = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${eventId}/picks/`;
    console.log('[IMPORT] Fetching picks from:', picksUrl);
    
    let picksRes = await fetch(picksUrl, { next: { revalidate: 60 } });
    
    if (!picksRes.ok && events.find((e: any) => e.is_current)?.id) {
      // fallback: try current event id if next failed
      const cur = events.find((e: any) => e.is_current)?.id;
      console.log('[IMPORT] First attempt failed (status:', picksRes.status, '), trying current event:', cur);
      
      if (cur && cur !== eventId) {
        const fallbackUrl = `https://fantasy.premierleague.com/api/entry/${entryId}/event/${cur}/picks/`;
        console.log('[IMPORT] Fallback URL:', fallbackUrl);
        picksRes = await fetch(fallbackUrl, { next: { revalidate: 60 } });
      }
    }
    
    if (!picksRes.ok) {
      console.error('[IMPORT] Failed to load picks. Status:', picksRes.status);
      const msg = picksRes.status === 404 
        ? `FPL team ${entryId} not found or no picks available for GW${eventId}. Make sure your team ID is correct and you have made picks for this gameweek.` 
        : "Failed to load entry picks";
      return NextResponse.json({ error: msg, details: { entryId, eventId, status: picksRes.status } }, { status: picksRes.status || 500 });
    }

    const picksJson = await picksRes.json();
    const picks: Array<{ element: number; position: number; is_captain: boolean; is_vice_captain: boolean }> = picksJson.picks || [];
    const entryHistory = picksJson.entry_history || {};
    
    console.log('[IMPORT] Successfully loaded', picks.length, 'picks for entry', entryId);

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
    console.log('[IMPORT] Successfully built squad with', totalStarters, 'starters and', s.bench.length, 'bench players. Bank:', s.bank);
    console.log('[IMPORT] Captain:', s.captainId, 'Vice:', s.viceId);
    console.log('[IMPORT] Sample starters:', Object.values(s.starters).flat().slice(0, 3).map(p => p.name));

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
