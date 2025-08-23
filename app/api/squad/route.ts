import { NextResponse } from "next/server";
import { fetchPlayersWithMarket } from "@/lib/market";
import type { Player, Position, Squad } from "@/lib/data";

export const revalidate = 600; // seconds

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

    // Load bootstrap (for event id) and player universe (with calibrated EP and current prices)
    const [bootstrapRes, players] = await Promise.all([
      fetch("https://fantasy.premierleague.com/api/bootstrap-static/", { next: { revalidate: 900 } }),
      fetchPlayersWithMarket(preset),
    ]);
    if (!bootstrapRes.ok) throw new Error("Failed to load FPL bootstrap");
    const bootstrap = await bootstrapRes.json();
    const events: any[] = bootstrap.events || [];
    const eventId: number | undefined = pickEventId(events);
    if (!eventId) throw new Error("Could not determine current/next event");

    // Try to load the picks for the chosen event
    let picksRes = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${eventId}/picks/`, { next: { revalidate: 60 } });
    if (!picksRes.ok && events.find((e: any) => e.is_current)?.id) {
      // fallback: try current event id if next failed
      const cur = events.find((e: any) => e.is_current)?.id;
      if (cur && cur !== eventId) {
        picksRes = await fetch(`https://fantasy.premierleague.com/api/entry/${entryId}/event/${cur}/picks/`, { next: { revalidate: 60 } });
      }
    }
    if (!picksRes.ok) {
      const msg = picksRes.status === 404 ? "FPL team not found or no picks for event" : "Failed to load entry picks";
      return NextResponse.json({ error: msg }, { status: picksRes.status || 500 });
    }

    const picksJson = await picksRes.json();
    const picks: Array<{ element: number; position: number; is_captain: boolean; is_vice_captain: boolean }> = picksJson.picks || [];
    const entryHistory = picksJson.entry_history || {};

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

    return NextResponse.json(s, {
      headers: {
        "Cache-Control": "s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to import squad" }, { status: 500 });
  }
}
