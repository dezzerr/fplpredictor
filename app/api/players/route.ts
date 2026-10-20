import { NextResponse } from "next/server";
import { fetchPlayersWithMarket } from "@/lib/market";
import { rateLimitGuard } from "@/lib/request-security";
import { fetchOfficialSeasonKey } from "@/lib/fplSeason";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const protection = await rateLimitGuard(req, "players", 60, 60_000);
  if (protection) return protection;

  const url = new URL(req.url);
  const preset = url.searchParams.get("preset");
  try {
    const [players, seasonKey] = await Promise.all([fetchPlayersWithMarket(preset), fetchOfficialSeasonKey()]);
    const marketPlayers = players.filter((p) => p.expExplain?.source === 'market').length;
    const source = marketPlayers === 0 ? 'fpl' : marketPlayers === players.length ? 'market' : 'hybrid';
    return NextResponse.json(players, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Data-Source": source,
        "X-FPL-Season-Key": seasonKey,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Players API] Live player data unavailable:', message);
    return NextResponse.json(
      { error: "Live player data is temporarily unavailable. Please try again shortly.", source: "unavailable" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Data-Source": "unavailable",
        },
      },
    );
  }
}
