"use client";

import { useEffect, useMemo, useState } from "react";
import { HeaderKpis } from "@/components/HeaderKpis";
import { PitchCard } from "@/components/PitchCard";
import { NavigationBar } from "@/components/NavigationBar";
import { useSquadStore, type SquadState } from "@/store/squad";
import type { Player } from "@/lib/data";
import { Sparkles, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { BenchRail } from "@/components/BenchRail";
import { PlayerSheet } from "@/components/PlayerSheet";
import { PlayerFinder } from "@/components/PlayerFinder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/animated-number";
import { pickXIForWeek, weeklyExp, pickBestXIFromPool } from "@/lib/optimizer";
import { OnboardingDialog } from "@/components/OnboardingDialog";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [currentGw, setCurrentGw] = useState<number>(8);
  const counts = useSquadStore((s: SquadState) => s.counts());
  const starters = useSquadStore((s) => s.squad.starters);
  const bank = useSquadStore((s) => s.squad.bank);
  const captainId = useSquadStore((s) => s.squad.captainId);
  const [playerOpen, setPlayerOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [finderOpen, setFinderOpen] = useState(false);
  const [gwOffset, setGwOffset] = useState<number>(0);
  const squad = useSquadStore((s) => s.squad);
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const totalExpForWeek = useSquadStore((s) => s.totalExpForWeek);

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

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const res = await fetch('/api/deadline');
        if (!res.ok) return;
        const data = await res.json();
        const gw =
          typeof data.eventId === "number"
            ? data.eventId
            : parseInt(String(data.eventId), 10);

        if (active && !Number.isNaN(gw)) {
          setCurrentGw(gw);
        }
      } catch (e) {
        console.error("Failed to fetch current gameweek:", e);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Week-aware KPIs based on selected GW - use reactive store calculation
  // This will update whenever squad changes (subs, captain changes, etc)
  const weekPredPts = mounted ? totalExpForWeek(gwOffset) : 0;

  // Get current XI selection (recalculates on every squad change)
  // Track critical values that change during subs/captain changes to force recalculation
  const starterIds = [...starters.GK, ...starters.DEF, ...starters.MID, ...starters.FWD].map(p => p.id).join(',');
  const benchIds = useSquadStore((s) => s.squad.bench.map(p => p.id).join(','));
  
  const xiSel = useMemo(() => {
    if (!mounted) return { xi: [], bench: [], capId: null, points: 0 };
    // Recalculates when player positions change (starterIds/benchIds) or captain changes
    return pickXIForWeek(squad, gwOffset);
  }, [mounted, squad, gwOffset, starterIds, benchIds, captainId]);

  // Chip deltas for selected GW - use user's actual captain, not optimal
  const allPlayers = useMemo(() => [
    ...starters.GK, ...starters.DEF, ...starters.MID, ...starters.FWD, ...squad.bench
  ], [starters, squad.bench]);
  const userCaptain = mounted ? allPlayers.find((p) => p.id === captainId) : null;
  const tcDelta = mounted && userCaptain ? weeklyExp(userCaptain, gwOffset) : 0; // TC adds +cap points beyond normal double
  const bbDelta = mounted ? squad.bench.reduce((s, p) => s + weeklyExp(p, gwOffset), 0) : 0; // BB adds bench points
  const fhDelta = useMemo(() => {
    if (!mounted || !pool || !Array.isArray(pool) || pool.length === 0) return null;
    const best = pickBestXIFromPool(pool, gwOffset).points;
    const delta = best - weekPredPts;
    return Math.round(delta * 10) / 10;
  }, [mounted, pool, gwOffset, weekPredPts]);

  return (
    <div className="min-h-dvh">
      <ErrorBoundary compact name="HeaderKpis">
        <HeaderKpis onGwChange={setGwOffset} weekPredPts={weekPredPts} />
      </ErrorBoundary>
      <main className="container py-4 space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Main Content */}
          <div className="mx-auto w-full max-w-[880px] space-y-4">
            {/* Chip Deltas & Actions */}
            <div className="bg-card border rounded-lg p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-6">
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">TC</div>
                    <div className="text-sm sm:text-lg font-bold">
                      {mounted ? `${tcDelta >= 0 ? "+" : ""}${tcDelta.toFixed(1)}` : "+0.0"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">BB</div>
                    <div className="text-sm sm:text-lg font-bold">
                      {mounted ? `${bbDelta >= 0 ? "+" : ""}${bbDelta.toFixed(1)}` : "+0.0"}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">FH</div>
                    <div className="text-sm sm:text-lg font-bold">
                      {!mounted ? "..." : fhDelta === null ? "..." : `${fhDelta >= 0 ? "+" : ""}${fhDelta.toFixed(1)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile Player Finder Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFinderOpen(true)}
                    className="lg:hidden"
                  >
                    <Search className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Find</span>
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => autoSelectBestXI(gwOffset)}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">Auto</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Pitch */}
            <ErrorBoundary compact name="PitchCard">
              <PitchCard
                onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
                weekOffset={gwOffset}
              />
            </ErrorBoundary>

            {/* Navigation Bar */}
            <NavigationBar currentGameweek={currentGw} gwOffset={gwOffset} />

            {/* Bench */}
            <ErrorBoundary compact name="BenchRail">
              <BenchRail
                onPlayerClick={(id) => { setSelectedPlayerId(id); setPlayerOpen(true); }}
                weekOffset={gwOffset}
              />
            </ErrorBoundary>
          </div>

          {/* Sidebar - Player Finder */}
          <div className="hidden lg:block">
            <div className="sticky top-20">
              <ErrorBoundary compact name="PlayerFinder">
                <PlayerFinder />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </main>
      <PlayerSheet playerId={selectedPlayerId} open={playerOpen} onOpenChange={setPlayerOpen} />
      <OnboardingDialog />
      
      {/* Mobile Player Finder Sheet */}
      <Sheet open={finderOpen} onOpenChange={setFinderOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
          <SheetTitle className="sr-only">Find Players</SheetTitle>
          <SheetDescription className="sr-only">Search and add players to your squad</SheetDescription>
          <ErrorBoundary compact name="PlayerFinder">
            <PlayerFinder />
          </ErrorBoundary>
        </SheetContent>
      </Sheet>
    </div>
  );
}

