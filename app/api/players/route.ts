import { NextResponse } from "next/server";
import { fetchPlayersWithMarket } from "@/lib/market";
import { players as demoPlayers } from "@/lib/data";

export const revalidate = 900; // seconds

export async function GET(req: Request) {
  const url = new URL(req.url);
  const preset = url.searchParams.get("preset");
  try {
    const players = await fetchPlayersWithMarket(preset);
    const source = players.some((p: any) => p?.expExplain?.source === 'market') ? 'market' : 'fpl';
    return NextResponse.json(players, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=300",
        "X-Data-Source": source,
      },
    });
  } catch (e: any) {
    // Fallback to local demo dataset to avoid breaking the UI when FPL/odds fetch fails
    const msg = (e?.message || String(e || 'unknown')).slice(0, 200);
    return NextResponse.json(demoPlayers, {
      headers: {
        "Cache-Control": "s-maxage=900, stale-while-revalidate=300",
        "X-Data-Source": "demo",
        "X-Error": msg,
      },
    });
  }
}
