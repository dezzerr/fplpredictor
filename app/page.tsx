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
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";
import { pickXIForWeek, weeklyExp, pickBestXIFromPool } from "@/lib/optimizer";

export default function Page() {
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
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
  const xiSel = useMemo(() => {
    if (!mounted) return { xi: [], bench: [], capId: null, points: 0 };
    return pickXIForWeek(squad, gwOffset);
  }, [mounted, squad, gwOffset]);
  
  const weekPredPts = xiSel.points; // includes captain double
  const sumNoDouble = xiSel.xi.reduce((s, p) => s + weeklyExp(p, gwOffset), 0);
  const teamRatingWeek = useMemo(() => {
    if (!mounted) return 0;
    return clamp(Math.round((sumNoDouble / 11 / 6) * 100));
  }, [mounted, sumNoDouble, clamp]);
  
  const gwRatingWeek = useMemo(() => {
    if (!mounted) return 0;
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
  }, [mounted, xiSel.xi, gwOffset, clamp]);

  // Chip deltas for selected GW
  const capPlayer = mounted ? xiSel.xi.find((p) => p.id === xiSel.capId) : null;
  const tcDelta = mounted && capPlayer ? weeklyExp(capPlayer, gwOffset) : 0; // TC adds +cap points beyond normal double
  const bbDelta = mounted ? xiSel.bench.reduce((s, p) => s + weeklyExp(p, gwOffset), 0) : 0; // BB adds bench points
  const fhDelta = useMemo(() => {
    if (!mounted || !pool || !Array.isArray(pool) || pool.length === 0) return null;
    const best = pickBestXIFromPool(pool, gwOffset).points;
    const delta = best - weekPredPts;
    return Math.round(delta * 10) / 10;
  }, [mounted, pool, gwOffset, weekPredPts]);

  return (
    <div className="min-h-dvh">
      <HeaderKpis />
      <main className="container py-4 space-y-6">
        {/* Squad Header */}
        <div className="mx-auto max-w-[880px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Squad</h1>
              <FormationBadge counts={{ GK: starters.GK.length, DEF: starters.DEF.length, MID: starters.MID.length, FWD: starters.FWD.length }} />
              <span className="text-sm text-muted-foreground">{mounted ? counts.total : 0}/15</span>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/optimize" className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <Calendar className="mr-2 h-4 w-4" />
                Optimize
              </Link>
              <Link href="/players" className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground lg:hidden">
                <Search className="mr-2 h-4 w-4" />
                Find Players
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="mx-auto w-full max-w-[880px] space-y-4">
            {/* GW Navigation */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Viewing: <span className="font-semibold text-foreground">GW+{gwOffset + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setGwOffset((o) => Math.max(0, o - 1))} 
                  disabled={gwOffset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setGwOffset((o) => Math.min(9, o + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setGwOffset(0)}>
                  Reset
                </Button>
              </div>
            </div>

            {/* XI Summary */}
            <Card className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm font-medium">Expected Points:</span>
                    <span className="ml-2 text-lg font-bold text-primary">
                      {mounted ? weekPredPts.toFixed(1) : "0.0"}
                    </span>
                  </div>
                  {(() => {
                    if (!mounted) return null;
                    const cap = xiSel.xi.find((p) => p.id === xiSel.capId);
                    return cap ? (
                      <div className="text-sm text-muted-foreground">
                        Captain: <span className="font-medium text-foreground">{cap.name}</span>
                      </div>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div>TC: <span className="font-semibold">
                    {mounted ? `${tcDelta >= 0 ? "+" : ""}${tcDelta.toFixed(1)}` : "+0.0"}
                  </span></div>
                  <div>BB: <span className="font-semibold">
                    {mounted ? `${bbDelta >= 0 ? "+" : ""}${bbDelta.toFixed(1)}` : "+0.0"}
                  </span></div>
                  <div>FH: <span className="font-semibold">
                    {!mounted ? "..." : fhDelta === null ? "..." : `${fhDelta >= 0 ? "+" : ""}${fhDelta.toFixed(1)}`}
                  </span></div>
                </div>
              </div>
            </Card>

            {/* Pitch */}
            <PitchCard
              onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
              weekOffset={gwOffset}
            />

            {/* Bench */}
            <BenchRail
              onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
              weekOffset={gwOffset}
            />
          </div>

          {/* Sidebar - Player Finder */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <ErrorBoundary>
                <PlayerFinder />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
      <PlayerSheet playerId={selectedPlayerId} open={playerOpen} onOpenChange={setPlayerOpen} />
    </div>
  );
}

