"use client";

import { useEffect, useMemo, useState } from "react";
import { HeaderKpis } from "@/components/HeaderKpis";
import { PitchCard } from "@/components/PitchCard";
import { FormationBadge } from "@/components/FormationBadge";
import { useSquadStore, type SquadState } from "@/store/squad";
import type { Player } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { BenchRail } from "@/components/BenchRail";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerFinder } from "@/components/PlayerFinder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";
import { pickXIForWeek, weeklyExp, pickBestXIFromPool } from "@/lib/optimizer";

export default function Page() {
  const counts = useSquadStore((s: SquadState) => s.counts());
  const starters = useSquadStore((s) => s.squad.starters);
  const bank = useSquadStore((s) => s.squad.bank);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [gwOffset, setGwOffset] = useState<number>(0);
  const squad = useSquadStore((s) => s.squad);

  // Load full player pool (for FH EV)
  const [pool, setPool] = useState<Player[] | null>(null);
  const [poolError, setPoolError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/players`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Player[];
        if (active) setPool(data);
      } catch (e: any) {
        if (active) setPoolError(e?.message || "Failed to load player pool");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Week-aware KPIs based on selected GW
  const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));
  const xiSel = pickXIForWeek(squad, gwOffset);
  const weekPredPts = xiSel.points; // includes captain double
  const sumNoDouble = xiSel.xi.reduce((s, p) => s + weeklyExp(p, gwOffset), 0);
  const teamRatingWeek = clamp(Math.round((sumNoDouble / 11 / 6) * 100));
  const gwRatingWeek = (() => {
    const xi = xiSel.xi;
    let sumW = 0;
    let sumD = 0;
    for (const p of xi) {
      const f = p.nextFixtures?.[gwOffset];
      const d = f?.diff ?? 3;
      const w = p.minutesProb ?? 1;
      sumW += w;
      sumD += d * w;
    }
    const avgDiff = sumW > 0 ? sumD / sumW : 3;
    return clamp(Math.round(((6 - avgDiff) / 5) * 100));
  })();

  // Chip deltas for selected GW
  const capPlayer = xiSel.xi.find((p) => p.id === xiSel.capId);
  const tcDelta = capPlayer ? weeklyExp(capPlayer, gwOffset) : 0; // TC adds +cap points beyond normal double
  const bbDelta = xiSel.bench.reduce((s, p) => s + weeklyExp(p, gwOffset), 0); // BB adds bench points
  const fhDelta = useMemo(() => {
    if (!pool || !Array.isArray(pool) || pool.length === 0) return null;
    const best = pickBestXIFromPool(pool, gwOffset).points;
    const delta = best - weekPredPts;
    return Math.round(delta * 10) / 10;
  }, [pool, gwOffset, weekPredPts]);

  return (
    <div className="min-h-dvh">
      <HeaderKpis compact />
      <main className="container py-4">
        {/* Squad KPI bar above the pitch */}
        <div className="mx-auto max-w-[880px]">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">Predicted Pts</div>
              <div className="text-lg font-semibold"><AnimatedNumber value={weekPredPts} /></div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">GW Rating</div>
              <div className="text-lg font-semibold"><AnimatedNumber value={gwRatingWeek} format={(n)=>`${Math.round(n)}%`} /></div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">Team Rating</div>
              <div className="text-lg font-semibold"><AnimatedNumber value={teamRatingWeek} format={(n)=>`${Math.round(n)}%`} /></div>
            </Card>
            <Card className="px-4 py-2">
              <div className="text-xs text-muted-foreground">Bank</div>
              <div className="text-lg font-semibold">£<AnimatedNumber value={bank} /></div>
            </Card>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <Link href={{ pathname: "/optimize" }} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90" aria-label="Edit upcoming weeks on Optimize page">
              <Calendar className="mr-2 h-4 w-4" /> Edit Weeks
            </Link>
          </div>
        </div>
        <div className="mb-3 mt-6 flex items-center justify-between gap-2 mx-auto max-w-[880px]">
          <div className="flex items-center gap-3">
            <div className="text-lg font-semibold">Squad</div>
            <FormationBadge counts={{ GK: starters.GK.length, DEF: starters.DEF.length, MID: starters.MID.length, FWD: starters.FWD.length }} />
            <span className="text-xs text-muted-foreground">{counts.total}/15</span>
          </div>
          <div>
            <Link href={{ pathname: "/players" }} className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 lg:hidden">
              <Search className="mr-2 h-4 w-4" /> Find Players
            </Link>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Left: Pitch and Bench, centered within max width */}
          <div className="min-w-0">
            {/* GW selector + summary */}
            <div className="mx-auto mb-2 flex max-w-[880px] items-center justify-between gap-2">
              <div className="text-sm text-muted-foreground">Viewing: <span className="font-semibold">GW+{gwOffset + 1}</span></div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setGwOffset((o) => Math.max(0, o - 1))} disabled={gwOffset === 0} aria-label="Previous GW">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setGwOffset((o) => Math.min(9, o + 1))} aria-label="Next GW">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setGwOffset(0)} aria-label="Reset to next GW">
                  <Calendar className="mr-1 h-4 w-4" /> Next GW
                </Button>
              </div>
            </div>

            {/* Best XI summary for selected GW */}
            <div className="mx-auto mb-2 max-w-[880px]">
              {(() => {
                const { points, capId, xi } = pickXIForWeek(squad, gwOffset);
                const cap = xi.find((p) => p.id === capId);
                return (
                  <Card className="px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold">GW+{gwOffset + 1}</span> best XI: <span className="font-semibold">{points.toFixed(1)} pts</span>
                      </div>
                      {cap && (
                        <div>
                          Captain: <span className="font-medium">{cap.name}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })()}
            </div>

            {/* Chip EV summary for selected GW */}
            <div className="mx-auto mb-2 max-w-[880px]">
              <Card className="px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">Chip EV (GW+{gwOffset + 1})</div>
                  <div className="flex items-center gap-4">
                    <div>TC: <span className="font-semibold">{tcDelta >= 0 ? "+" : ""}{tcDelta.toFixed(1)}</span></div>
                    <div>BB: <span className="font-semibold">{bbDelta >= 0 ? "+" : ""}{bbDelta.toFixed(1)}</span></div>
                    <div>FH: <span className="font-semibold">{fhDelta === null ? (poolError ? "n/a" : "…") : `${fhDelta >= 0 ? "+" : ""}${fhDelta.toFixed(1)}`}</span></div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Removed inline plan summary and editor per requirements */}

            <div className="mx-auto max-w-[880px]">
              <PitchCard
                onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
                weekOffset={gwOffset}
              />
            </div>

            <div className="mt-4 mx-auto max-w-[880px]">
              <BenchRail
                onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
                weekOffset={gwOffset}
              />
            </div>

            <div className="mt-4 mx-auto max-w-[880px]">
              <Card className="p-3 text-xs text-muted-foreground">
                Drag and drop players between pitch and slots. Use the Finder page to add players; constraints like budget, per-club and position limits are enforced. Visit the Optimize page for transfer plans and chip EV.
              </Card>
            </div>
          </div>

          {/* Right: Player Finder sidebar (lg+) */}
          <div className="hidden lg:block">
            <div className="sticky top-2">
              <PlayerFinder />
            </div>
          </div>
        </div>
      </main>
      <PlayerSheet playerId={selectedPlayerId} open={playerOpen} onOpenChange={setPlayerOpen} />
    </div>
  );
}

