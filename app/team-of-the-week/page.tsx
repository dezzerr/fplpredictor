"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppNavbar } from "@/components/AppNavbar";
import { GwInfoBar } from "@/components/GwInfoBar";
import { OptimalPitchView } from "@/components/OptimalPitchView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LiveGwProvider } from "@/components/LiveGwProvider";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Download,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useSquadStore } from "@/store/squad";
import { pickBestXIFromPool, weeklyExp } from "@/lib/optimizer";
import type { Player } from "@/lib/data";
import { toast } from "sonner";

export default function TeamOfTheWeekPage() {
  const [gwOffset, setGwOffset] = useState<number>(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const addPlayer = useSquadStore((s) => s.addPlayer);
  const squad = useSquadStore((s) => s.squad);

  const ownedIds = useMemo(() => {
    const ids = new Set<string>();
    [
      ...squad.starters.GK,
      ...squad.starters.DEF,
      ...squad.starters.MID,
      ...squad.starters.FWD,
      ...squad.bench,
    ].forEach((p) => ids.add(p.id));
    return ids;
  }, [squad]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/players", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch players");
        const data: Player[] = await res.json();
        if (!cancelled) setPlayers(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load players");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totw = useMemo(() => {
    if (!players.length) return null;
    return pickBestXIFromPool(players, gwOffset);
  }, [players, gwOffset]);

  const captain = useMemo(
    () => totw?.xi.find((p) => p.id === totw.capId) ?? null,
    [totw]
  );

  const missing = useMemo(() => {
    if (!totw) return [] as Player[];
    return totw.xi.filter((p) => !ownedIds.has(p.id));
  }, [totw, ownedIds]);

  const totalValue = useMemo(
    () => (totw ? totw.xi.reduce((s, p) => s + p.price, 0) : 0),
    [totw]
  );

  const applyMissing = () => {
    if (!missing.length) {
      toast.info("You already own every player in this XI");
      return;
    }
    let ok = 0;
    const failed: string[] = [];
    for (const p of missing) {
      const r = addPlayer(p);
      if (r.ok) ok++;
      else failed.push(p.name);
    }
    if (ok) toast.success(`Added ${ok} player${ok > 1 ? "s" : ""} to your squad`);
    if (failed.length)
      toast.error(
        `Couldn't add: ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}`
      );
  };

  return (
    <LiveGwProvider>
      <div className="min-h-dvh bg-slate-50">
        <ErrorBoundary compact name="AppNavbar">
          <AppNavbar />
          <GwInfoBar gwOffset={gwOffset} />
        </ErrorBoundary>
        <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="h-7 w-7 text-amber-500" />
                Team of the Week
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Best XI from every Premier League player for the selected gameweek.
              </p>
            </div>
            <Link
              href={"/optimize" as any}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
            >
              <TrendingUp className="h-4 w-4" />
              Optimise My Squad
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
                  Expected Pts
                </div>
                <div className="text-xl font-bold text-emerald-600 flex items-center gap-1">
                  <Zap className="h-4 w-4" />
                  {(totw?.points ?? 0).toFixed(1)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-wider text-slate-500">
                  Total Value
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  £{totalValue.toFixed(1)}m
                </div>
              </div>
              {totw && (
                <div className="text-center">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" /> You Own
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {totw.xi.length - missing.length}/{totw.xi.length}
                  </div>
                </div>
              )}
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

          {/* Pitch */}
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-16 flex flex-col items-center gap-3">
              <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-emerald-600" />
              <div className="text-sm text-muted-foreground">
                Analysing every player…
              </div>
            </div>
          ) : error || !totw ? (
            <div className="bg-white rounded-xl border border-dashed border-rose-300 p-12 text-center">
              <div className="text-sm text-rose-600">
                {error || "Unable to build Team of the Week"}
              </div>
            </div>
          ) : (
            <ErrorBoundary compact name="OptimalPitchView">
              <OptimalPitchView
                xi={totw.xi}
                captainId={totw.capId}
                weekOffset={gwOffset}
                ownedIds={ownedIds}
                highlightOwned
              />
            </ErrorBoundary>
          )}

          {/* Apply missing */}
          {totw && missing.length > 0 && (
            <div className="mt-5">
              <Button
                onClick={applyMissing}
                className="w-full h-12 text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                <Download className="mr-2 h-5 w-5" />
                Add {missing.length} Missing Player{missing.length > 1 ? "s" : ""} to My Squad
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Respects FPL limits — some players may be skipped if they break squad rules.
              </p>
            </div>
          )}
        </main>
      </div>
    </LiveGwProvider>
  );
}
