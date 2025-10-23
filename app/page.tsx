"use client";

import { useEffect, useMemo, useState } from "react";
import { HeaderKpis } from "@/components/HeaderKpis";
import { PitchCard } from "@/components/PitchCard";
import { useSquadStore, type SquadState } from "@/store/squad";
import type { Player } from "@/lib/data";
import { Sparkles } from "lucide-react";
import { BenchRail } from "@/components/BenchRail";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerFinder } from "@/components/PlayerFinder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);

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
      <HeaderKpis onGwChange={setGwOffset} weekPredPts={weekPredPts} />
      <main className="container py-4 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="mx-auto w-full max-w-[880px] space-y-4">
            {/* Chip Deltas & Actions */}
            <div className="bg-card border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">TC</div>
                    <div className="text-lg font-bold">
                      {mounted ? `${tcDelta >= 0 ? "+" : ""}${tcDelta.toFixed(1)}` : "+0.0"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">BB</div>
                    <div className="text-lg font-bold">
                      {mounted ? `${bbDelta >= 0 ? "+" : ""}${bbDelta.toFixed(1)}` : "+0.0"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-1">FH</div>
                    <div className="text-lg font-bold">
                      {!mounted ? "..." : fhDelta === null ? "..." : `${fhDelta >= 0 ? "+" : ""}${fhDelta.toFixed(1)}`}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => autoSelectBestXI(gwOffset)}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Auto-Select Best XI</span>
                  <span className="sm:hidden">Auto</span>
                </Button>
              </div>
            </div>

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

