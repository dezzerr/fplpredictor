"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Crown,
  Flame,
  Snowflake,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Loader2,
  Zap,
  Target,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { Player } from "@/lib/data";
import { useSquadStore } from "@/store/squad";

interface Insight {
  type: string;
  playerName: string;
  team: string;
  title: string;
  detail: string;
  sentiment: "positive" | "negative" | "neutral";
  expectedGain?: number;
  confidence?: "high" | "medium" | "low";
  source?: "model" | "gemini";
  transferOut?: string;
  transferIn?: string;
}

interface InsightPanelProps {
  gameweek?: number | null;
  players?: Player[];
  bank?: number;
  className?: string;
}

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  captain:        { icon: Crown,          color: "text-yellow-600",  bg: "bg-yellow-50 border-yellow-200" },
  form_hot:       { icon: Flame,          color: "text-orange-600",  bg: "bg-orange-50 border-orange-200" },
  form_cold:      { icon: Snowflake,      color: "text-sky-600",     bg: "bg-sky-50 border-sky-200" },
  fixture_easy:   { icon: TrendingUp,     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  fixture_hard:   { icon: TrendingDown,   color: "text-red-600",     bg: "bg-red-50 border-red-200" },
  rotation_risk:  { icon: RotateCcw,      color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  transfer_out:   { icon: ArrowRightLeft, color: "text-red-600",     bg: "bg-red-50 border-red-200" },
  transfer_in:    { icon: ArrowRightLeft, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  differential:   { icon: Zap,            color: "text-purple-600",  bg: "bg-purple-50 border-purple-200" },
  value_pick:     { icon: Target,         color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200" },
  price_watch:    { icon: TrendingUp,     color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  chip_plan:      { icon: Sparkles,       color: "text-indigo-600",   bg: "bg-indigo-50 border-indigo-200" },
  chip_advice:    { icon: Sparkles,       color: "text-cyan-600",    bg: "bg-cyan-50 border-cyan-200" },
};

const SENTIMENT_DOT: Record<string, string> = {
  positive: "bg-emerald-500",
  negative: "bg-red-500",
  neutral: "bg-slate-400",
};

export function InsightPanel({ gameweek, players, bank, className }: InsightPanelProps) {
  const entryId = useSquadStore((s) => s.lastImport?.entryId ?? null);
  const squadEntryId = useSquadStore((s) => s.squad.entryId ?? null);
  const squad = useSquadStore((s) => s.squad);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [meta, setMeta] = useState<{ source?: string; geminiTimedOut?: boolean; latencyMs?: number; managerContextAvailable?: boolean; personalizationWarnings?: string[]; gameweek?: number } | null>(null);

  const generate = useCallback(async () => {
    if (!players || players.length === 0) {
      toast.error("Import a squad first to generate insights");
      return;
    }
    if (typeof gameweek !== "number" || !Number.isFinite(gameweek)) {
      toast.error("Gameweek is still loading. Try again in a moment.");
      return;
    }
    setLoading(true);
    try {
      const payload = players.map((p) => ({
        name: p.name,
        team: p.team,
        position: p.position,
        price: p.price,
        form: p.form,
        expPoints: p.expPoints,
        minutesProb: p.minutesProb,
        ownership: p.ownership,
        priceChangeEvent: p.priceChangeEvent,
        transfersInEvent: p.transfersInEvent,
        transfersOutEvent: p.transfersOutEvent,
        fixtures: (p.nextFixtures || []).slice(0, 5).map((f) => ({
          opp: f.opp,
          H: f.H,
          diff: f.diff,
        })),
      }));

      const res = await fetch("/api/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: payload, gameweek, bank, entryId: entryId || squadEntryId, squad }),
      });

      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
        setMeta({
          source: data.source,
          geminiTimedOut: data.geminiTimedOut,
          latencyMs: data.latencyMs,
          managerContextAvailable: data.managerContextAvailable,
          personalizationWarnings: Array.isArray(data.personalizationWarnings) ? data.personalizationWarnings : [],
          gameweek: typeof data.gameweek === "number" ? data.gameweek : undefined,
        });
        setHasGenerated(true);
        if ((data.insights || []).length > 0) {
          const mode = data.source === "hybrid" ? "Hybrid" : "Fast";
          toast.success(`${data.insights.length} ${mode} insights generated`);
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to generate insights");
      }
    } catch (err) {
      toast.error("Failed to generate insights");
      console.error("[InsightPanel] Generate error:", err);
    } finally {
      setLoading(false);
    }
  }, [players, gameweek, bank, entryId, squadEntryId, squad]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600" />
          <span className="text-sm font-semibold">AI Insights</span>
          {insights.length > 0 && (
            <Badge className="text-[10px] bg-purple-100 text-purple-700 border-purple-300">
              {insights.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="border-t">
          {/* Generate button */}
          {!hasGenerated && !loading && (
            <div className="p-4 text-center">
              <Brain className="h-10 w-10 text-purple-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                {typeof gameweek === "number" ? `Get AI-powered insights for your GW${gameweek} squad` : "Gameweek loading before insights can run"}
              </p>
              <button
                onClick={generate}
                disabled={!players || players.length === 0 || typeof gameweek !== "number"}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                Generate Insights
              </button>
              {(!players || players.length === 0) && (
                <p className="text-xs text-muted-foreground mt-2">Import a squad first</p>
              )}
              <p className="text-[11px] text-slate-500 mt-2">Fast model picks first, with optional AI enrichment.</p>
            </div>
          )}

          {/* Loading shimmer */}
          {loading && (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Building transfer, differential, and price-watch insights...
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-slate-200" />
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-full ml-9" />
                </div>
              ))}
            </div>
          )}

          {/* Insights list */}
          {hasGenerated && !loading && insights.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground">No insights generated</p>
              <button
                onClick={generate}
                className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                Try again
              </button>
            </div>
          )}

          {hasGenerated && !loading && insights.length > 0 && (
            <>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {insights.map((ins, idx) => {
                  const config = TYPE_CONFIG[ins.type] || TYPE_CONFIG.differential;
                  const Icon = config.icon;

                  return (
                    <div
                      key={idx}
                      className="px-4 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn("p-1.5 rounded-md shrink-0", config.bg)}>
                          <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium leading-tight">{ins.title}</span>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SENTIMENT_DOT[ins.sentiment] || SENTIMENT_DOT.neutral)} />
                          </div>
                          {ins.playerName && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs font-medium text-slate-700">{ins.playerName}</span>
                              {ins.team && (
                                <Badge className="text-[8px] bg-slate-100 text-slate-500 border-slate-200 px-1 py-0">
                                  {ins.team}
                                </Badge>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {ins.detail}
                          </p>
                          {(typeof ins.expectedGain === "number" || ins.confidence || ins.source) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {typeof ins.expectedGain === "number" && (
                                <Badge className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 px-1.5 py-0">
                                  +{ins.expectedGain.toFixed(1)} pts
                                </Badge>
                              )}
                              {ins.confidence && (
                                <Badge className="text-[9px] bg-slate-100 text-slate-600 border-slate-200 px-1.5 py-0 capitalize">
                                  {ins.confidence} confidence
                                </Badge>
                              )}
                              {ins.source && (
                                <Badge className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 px-1.5 py-0 uppercase">
                                  {ins.source}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {meta && (
                <div className="border-t px-3 py-2 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>
                    {meta.source === "hybrid" ? "Hybrid insights" : "Fast deterministic insights"}
                    {typeof meta.gameweek === "number" ? ` · GW${meta.gameweek}` : ""}
                    {meta.managerContextAvailable ? " · personalized" : " · squad-only"}
                    {meta.geminiTimedOut ? " · AI enrichment timed out" : ""}
                  </span>
                  {typeof meta.latencyMs === "number" && <span>{Math.round(meta.latencyMs / 100) / 10}s</span>}
                </div>
              )}
              {/* Refresh button */}
              <div className="border-t p-3">
                <button
                  onClick={generate}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Refresh Insights
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}
