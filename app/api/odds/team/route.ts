import { NextRequest } from "next/server";
import { cachedTeamOdds } from "@/lib/odds";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const event = Number(searchParams.get("event") || 0) || 0;
  try {
    const data = await cachedTeamOdds(event);
    return new Response(JSON.stringify({ event, data }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || "Failed to fetch team odds" }), { status: 500 });
  }
}
