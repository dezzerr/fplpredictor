"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNavbar } from "@/components/AppNavbar";
import { GwInfoBar } from "@/components/GwInfoBar";
import { OptimalPitchView } from "@/components/OptimalPitchView";
import { TransferRecommendations } from "@/components/TransferRecommendations";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LiveGwProvider } from "@/components/LiveGwProvider";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Crown, Trophy, TrendingUp, Zap } from "lucide-react";
import { useSquadStore } from "@/store/squad";
import { pickXIForWeek, weeklyExp } from "@/lib/optimizer";
import { toast } from "sonner";

export default function OptimizePage() {
  const [gwOffset, setGwOffset] = useState<number>(0);
  const squad = useSquadStore((s) => s.squad);
  const autoSelectBestXI = useSquadStore((s) => s.autoSelectBestXI);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const syncPrices = useSquadStore((s) => s.syncPrices);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/players", { cache: "no-store" });
        if (!res.ok) return;
        const players = await res.json();
        if (!cancelled) syncPrices(players);
      } catch {
        // best-effort sync only
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncPrices]);

  const optimized = useMemo(() => pickXIForWeek(squad, gwOffset), [squad, gwOffset]);
  const captain = useMemo(
    () => optimized.xi.find((p) => p.id === optimized.capId),
    [optimized]
  );

  const squadSize =
    squad.starters.GK.length +
    squad.starters.DEF.length +
    squad.starters.MID.length +
    squad.starters.FWD.length +
    squad.bench.length;

  const applyOptimal = () => {
    if (squadSize < 11) {
      toast.error("Add players to your squad first");
      return;
    }
    autoSelectBestXI(gwOffset);
    if (optimized.capId) makeCaptain(optimized.capId);
    toast.success("Optimal XI applied to your squad");
  };

  return (
    <LiveGwProvider>
      <div className="min-h-dvh bg-slate-50">
        <ErrorBoundary compact name="AppNavbar">
          <AppNavbar />
          <GwInfoBar gwOffset={gwOffset} />
        </ErrorBoundary>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Optimise Your Squad
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your highest-scoring XI from players already in your squad.
              </p>
            </div>
            <Link
              href={"/team-of-the-week" as any}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Trophy className="h-4 w-4" />
              View Team of the Week
            </Link>
          </div>

          {/* GW picker + stats */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGwOffset((v) => Math.max(0, v - 1))}
                disabled={gwOffset === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-semibold text-slate-800 min-w-[90px] text-center">
                {gwOffset === 0 ? "This GW" : `+${gwOffset} GW`}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setGwOffset((v) => Math.min(9, v + 1))}
                disabled={gwOffset >= 9}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Predicted Pts
                </div>
                <div className="text-xl font-bold text-violet-600 flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  {optimized.points.toFixed(1)}
                </div>
              </div>
              {captain && (
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                    <Crown className="h-3 w-3 text-amber-500" /> Captain
                  </div>
                  <div className="text-sm font-semibold text-slate-800 truncate max-w-[140px]">
                    {captain.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {weeklyExp(captain, gwOffset).toFixed(1)} pts
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-6 items-start">
            {/* Left: Pitch (reduced footprint) */}
            <div>
              {squadSize < 11 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
                  <div className="text-lg font-semibold text-slate-800 mb-2">
                    No squad to optimise yet
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import your FPL squad or add players before running optimisation.
                  </p>
                  <Link
                    href={"/squad" as any}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet-600 text-white px-4 py-2 text-sm font-semibold hover:bg-violet-700"
                  >
                    Go to Pick Team
                  </Link>
                </div>
              ) : (
                <div className="max-w-[620px] mx-auto xl:mx-0">
                  <ErrorBoundary compact name="OptimalPitchView">
                    <OptimalPitchView
                      xi={optimized.xi}
                      bench={optimized.bench}
                      captainId={optimized.capId}
                      weekOffset={gwOffset}
                    />
                  </ErrorBoundary>
                </div>
              )}

              {/* Apply */}
              {squadSize >= 11 && (
                <div className="mt-5 max-w-[620px] mx-auto xl:mx-0">
                  <Button
                    onClick={applyOptimal}
                    className="w-full h-12 text-base bg-gradient-brand-cta hover:opacity-90 text-white"
                  >
                    <TrendingUp className="mr-2 h-5 w-5" />
                    Apply Optimal XI &amp; Captain
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    This sets your starting XI and captain to maximise predicted points.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Transfer Recommendations */}
            <div>
              <ErrorBoundary compact name="TransferRecommendations">
                <TransferRecommendations weekOffset={gwOffset} horizonWeeks={3} maxPlans={5} />
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </LiveGwProvider>
  );
}
