"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player, Squad } from "@/lib/data";
import { recommendTransfers, weeklyExp, type PlanResult } from "@/lib/optimizer";
import { useSquadStore } from "@/store/squad";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TeamShirt } from "@/components/TeamShirt";
import {
  ArrowRight,
  ArrowRightLeft,
  Brain,
  Loader2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn, getFPLDisplayName } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  weekOffset?: number;
  horizonWeeks?: number;
  maxPlans?: number;
}

function flattenSquad(s: Squad): Player[] {
  return [
    ...s.starters.GK,
    ...s.starters.DEF,
    ...s.starters.MID,
    ...s.starters.FWD,
    ...s.bench,
  ];
}

function PlayerCell({
  player,
  accent,
  weekOffset,
}: {
  player: Player;
  accent: "out" | "in";
  weekOffset: number;
}) {
  const pts = weeklyExp(player, weekOffset);
  const isOut = accent === "out";
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg p-3 border",
        isOut
          ? "bg-rose-50 border-rose-200"
          : "bg-emerald-50 border-emerald-200"
      )}
    >
      <TeamShirt team={player.team} className="w-10 h-10 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-900 truncate text-sm">
            {getFPLDisplayName(player.name)}
          </span>
          <Badge className="text-[9px] px-1 py-0 h-4 font-semibold bg-white border border-slate-300 text-slate-700">
            {player.position}
          </Badge>
        </div>
        <div className="text-[11px] text-slate-600">
          {player.team} • £{player.price.toFixed(1)}m
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div
          className={cn(
            "text-sm font-bold flex items-center gap-0.5 justify-end",
            isOut ? "text-rose-600" : "text-emerald-600"
          )}
        >
          <Zap className="w-3 h-3" />
          {pts.toFixed(1)}
        </div>
        <div className="text-[9px] text-slate-500">exp pts</div>
      </div>
    </div>
  );
}

function SignalChips({ player }: { player: Player }) {
  const signals = player.expExplain?.signals ?? [];
  if (!signals.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {signals.slice(0, 3).map((s, i) => {
        const positive = s.adjustment >= 0;
        return (
          <span
            key={`${s.signal}-${i}`}
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-2 py-0.5 border",
              positive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            )}
            title={s.reason}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {s.signal.replace(/_/g, " ")}
            <span className="font-mono opacity-70">
              {positive ? "+" : ""}
              {(s.adjustment * 100).toFixed(0)}%
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function TransferRecommendations({
  weekOffset = 0,
  horizonWeeks = 3,
  maxPlans = 5,
}: Props) {
  const squad = useSquadStore((s) => s.squad);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/players", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load players");
        const data: Player[] = await res.json();
        if (!cancelled) setAllPlayers(data);
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

  const squadPlayers = useMemo(() => flattenSquad(squad), [squad]);

  const plans: PlanResult[] = useMemo(() => {
    if (!allPlayers.length || squadPlayers.length < 15) return [];
    const results = recommendTransfers({
      squad,
      players: allPlayers,
      weeks: horizonWeeks,
      allowedFreeTransfers: 1,
      maxTransfersToConsider: 1,
      perPosCandidateLimit: 25,
    });
    // keep only positive-gain 1-transfer plans
    return results
      .filter((p) => p.transfers.length === 1 && p.netGain > 0)
      .slice(0, maxPlans);
  }, [allPlayers, squad, squadPlayers.length, horizonWeeks, maxPlans]);

  const playersById = useMemo(() => {
    const map = new Map<string, Player>();
    for (const p of allPlayers) map.set(p.id, p);
    for (const p of squadPlayers) if (!map.has(p.id)) map.set(p.id, p);
    return map;
  }, [allPlayers, squadPlayers]);

  if (squadPlayers.length < 15) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <ArrowRightLeft className="h-6 w-6 text-slate-400 mx-auto mb-2" />
        <div className="text-sm font-semibold text-slate-800">
          Import a full 15-player squad to see transfer recommendations
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-brand-cta px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold text-lg flex items-center gap-2">
              Transfer Recommendations
              <Badge className="bg-white/20 text-white border-0 text-[10px] font-semibold">
                <Brain className="w-3 h-3 mr-1" />
                AI-informed
              </Badge>
            </div>
            <div className="text-xs text-white/80">
              Ranked by net gain over next {horizonWeeks} GW{horizonWeeks > 1 ? "s" : ""} • Uses AI Insights signals
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Analysing transfer market…</span>
          </div>
        ) : error ? (
          <div className="text-sm text-rose-600 text-center py-6">{error}</div>
        ) : plans.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-800">
              No profitable transfers found
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Your squad already looks optimal for the next {horizonWeeks} GW
              {horizonWeeks > 1 ? "s" : ""}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan, idx) => {
              const t = plan.transfers[0];
              const outP = playersById.get(t.outId);
              const inP = t.inPlayer;
              if (!outP || !inP) return null;
              const gainPerWeek = plan.netGain / Math.max(1, plan.weeks);
              return (
                <div
                  key={`${t.outId}-${inP.id}-${idx}`}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="text-xs font-semibold text-slate-700">
                        Over {plan.weeks} GW
                        {plan.weeks > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-600 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />+{plan.netGain.toFixed(1)} pts
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ≈ +{gainPerWeek.toFixed(1)}/GW
                        {plan.hitCost > 0 && ` • −${plan.hitCost} hit`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-rose-600 font-semibold mb-1 flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Transfer Out
                      </div>
                      <PlayerCell player={outP} accent="out" weekOffset={weekOffset} />
                      <SignalChips player={outP} />
                    </div>
                    <div className="flex justify-center md:py-0 py-2">
                      <div className="p-2 rounded-full bg-gradient-brand-cta text-white shadow">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold mb-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Transfer In
                      </div>
                      <PlayerCell player={inP} accent="in" weekOffset={weekOffset} />
                      <SignalChips player={inP} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
