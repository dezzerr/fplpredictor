import { NextRequest } from "next/server";
import { cachedGoalscorerOdds } from "@/lib/odds";
import { rateLimitGuard } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const protection = await rateLimitGuard(req, "odds-scorers", 30, 60_000);
  if (protection) return protection;
  const { searchParams } = new URL(req.url);
  const event = Number(searchParams.get("event") || 0) || 0;
  try {
    const data = await cachedGoalscorerOdds(event);
    return new Response(JSON.stringify({ event, data }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Failed to fetch goalscorer odds" }), { status: 500 });
  }
}
