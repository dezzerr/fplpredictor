"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player, Position, Fixture } from "@/lib/data";
import { useSquadStore } from "@/store/squad";
import { weeklyExp } from "@/lib/optimizer";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Home,
  Plane,
  Target,
  Activity,
  Clock,
  Shield,
  Zap,
  ArrowLeftRight,
  Brain,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Snowflake,
  RotateCcw,
  Crosshair,
} from "lucide-react";

// FDR color mapping
function getFdrColor(diff: number): string {
  switch (diff) {
    case 1: return "bg-emerald-500";
    case 2: return "bg-lime-500";
    case 3: return "bg-amber-400";
    case 4: return "bg-orange-500";
    case 5: return "bg-red-500";
    default: return "bg-slate-400";
  }
}

function getFdrTextColor(diff: number): string {
  switch (diff) {
    case 1: return "text-white";
    case 2: return "text-slate-900";
    case 3: return "text-slate-900";
    case 4: return "text-white";
    case 5: return "text-white";
    default: return "text-white";
  }
}

// Team code to full name mapping
const TEAM_NAMES: Record<string, string> = {
  ARS: "Arsenal", AVL: "Aston Villa", BOU: "Bournemouth", BRE: "Brentford",
  BHA: "Brighton", CHE: "Chelsea", CRY: "Crystal Palace", EVE: "Everton",
  FUL: "Fulham", IPS: "Ipswich", LEI: "Leicester", LIV: "Liverpool",
  MCI: "Man City", MUN: "Man Utd", NEW: "Newcastle", NFO: "Nott'm Forest",
  SOU: "Southampton", TOT: "Spurs", WHU: "West Ham", WOL: "Wolves",
  LEE: "Leeds", LUT: "Luton", BUR: "Burnley", SHU: "Sheffield Utd"
};

// Get position label
const positionLabel = (pos: Position) => {
  switch (pos) {
    case "GK": return "Goalkeeper";
    case "DEF": return "Defender";
    case "MID": return "Midfielder";
    case "FWD": return "Forward";
  }
};

interface SeasonStats {
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  minutes: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  totalPoints: number;
  gamesPlayed: number;
}

interface DefconStats {
  points: number;
  timesEarned: number;
}

interface HistoricalData {
  lastFiveGWs: Array<{
    gw: number;
    points: number;
    minutes: number;
    home: boolean;
    goals: number;
    assists: number;
    bonus: number;
    cleanSheets: number;
  }>;
  avgPoints: number;
  homeAvg: number;
  awayAvg: number;
  totalPoints: number;
  trend: 'up' | 'down' | 'stable';
  seasonStats: SeasonStats;
  defcon: DefconStats;
}

interface PlayerDetailModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  weekOffset?: number;
  onSelectReplacement?: (player: Player) => void;
  onSubstitute?: (player: Player) => void;
  side?: "right" | "bottom";
}

export function PlayerDetailModal({
  player,
  open,
  onOpenChange,
  weekOffset = 0,
  onSelectReplacement,
  onSubstitute,
  side = "right",
}: PlayerDetailModalProps) {
  const squad = useSquadStore((s) => s.squad);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  const makeVice = useSquadStore((s) => s.makeVice);
  const removePlayer = useSquadStore((s) => s.removePlayer);

  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCaptain = squad.captainId === player?.id;
  const isVice = squad.viceId === player?.id;

  // Fetch player history when player changes
  useEffect(() => {
    if (!player || !open) {
      setHistoricalData(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/player-history?playerId=${player.id}`);

        if (!res.ok) {
          throw new Error('Failed to fetch player history');
        }

        const data = await res.json();
        if (!cancelled) {
          setHistoricalData(data);
        }
      } catch (e: any) {
        console.error('Failed to load player history:', e);
        if (!cancelled) {
          setError(e?.message || 'Failed to load history');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [player?.id, open]);

  // Calculate stats
  const predictedPts = player ? weeklyExp(player, weekOffset) : 0;
  const selectedBy = player?.ownership ? `${player.ownership.toFixed(1)}%` : "0%";

  const getPointsColor = (points: number) => {
    if (points >= 10) return 'bg-emerald-500 text-white';
    if (points >= 6) return 'bg-green-500 text-white';
    if (points >= 3) return 'bg-yellow-400 text-gray-900';
    if (points >= 1) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };

  const getTrendIcon = () => {
    if (!historicalData) return <Minus className="h-4 w-4 text-gray-600" />;
    if (historicalData.trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (historicalData.trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  if (!player) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={side} className={cn(
          "p-0 overflow-y-auto",
          side === "right" ? "w-[420px]" : "h-[85vh] rounded-t-3xl"
        )}>
          <SheetTitle className="sr-only">No Player Selected</SheetTitle>
          <div className="p-6 text-center text-muted-foreground">No player selected.</div>
        </SheetContent>
      </Sheet>
    );
  }

  const handleRemove = () => {
    removePlayer(player.id);
    onOpenChange(false);
    toast.success(`Removed ${player.name}`);
  };

  const handleSubstitute = () => {
    if (onSubstitute && player) {
      onSubstitute(player);
      onOpenChange(false);
    }
  };

  // Check if player can earn Defcon (not GK)
  const canEarnDefcon = player.position !== "GK";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={cn(
        "p-0 overflow-y-auto",
        side === "right" ? "w-[420px]" : "h-[85vh] rounded-t-3xl"
      )}>
        <SheetTitle className="sr-only">{player.name} - Player Details</SheetTitle>

        {/* Header with gradient background */}
        <div className={cn(
          "relative bg-gradient-to-br from-purple-600 via-blue-500 to-cyan-400 overflow-hidden",
          side === "right" ? "h-48" : "h-56 rounded-t-3xl"
        )}>
          {/* Player image */}
          <div className={cn(
            "absolute left-4 bottom-4 bg-white/20 rounded-lg flex items-center justify-center",
            side === "right" ? "w-28 h-36" : "w-32 h-40"
          )}>
            {player.photo ? (
              <img src={player.photo} alt={player.name} className="w-full h-full object-cover rounded-lg" />
            ) : (
              <div className={side === "right" ? "text-5xl" : "text-6xl"}>👤</div>
            )}
          </div>

          {/* Player info */}
          <div className={cn(
            "absolute right-4 text-white text-right",
            side === "right" ? "top-10" : "top-12"
          )}>
            <div className="text-sm font-medium opacity-90">{positionLabel(player.position)}</div>
            <div className={side === "right" ? "text-xl font-light" : "text-2xl font-light"}>
              {player.name.split(' ')[0]}
            </div>
            <div className={side === "right" ? "text-2xl font-bold" : "text-3xl font-bold"}>
              {player.name.split(' ').slice(1).join(' ') || player.name}
            </div>
            <div className={cn("mt-1 opacity-90", side === "right" ? "text-base" : "text-lg")}>
              {TEAM_NAMES[player.team] || player.team}
            </div>
          </div>

          {/* Captain/Vice badges */}
          {(isCaptain || isVice) && (
            <div className="absolute top-4 right-4">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${isCaptain ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-300 text-slate-700'}`}>
                {isCaptain ? 'Captain' : 'Vice'}
              </span>
            </div>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex gap-2 px-4 py-3 border-b">
          <button
            onClick={() => { makeCaptain(player.id); toast.success(`${player.name} is captain`); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border border-slate-300 text-sm font-medium hover:bg-slate-50"
          >
            Make Captain
          </button>
          <button
            onClick={() => { makeVice(player.id); toast.success(`${player.name} is vice-captain`); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border border-slate-300 text-sm font-medium hover:bg-slate-50"
          >
            Make Vice
          </button>
        </div>

        {/* Quick Stats grid */}
        <div className="grid grid-cols-4 gap-px bg-slate-200 mx-4 mt-4 rounded-lg overflow-hidden">
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Price</div>
            <div className="text-lg font-bold text-purple-700">£{player.price.toFixed(1)}m</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Form</div>
            <div className="text-lg font-bold text-purple-700">{player.form?.toFixed(1) || "0.0"}</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Predicted</div>
            <div className="text-lg font-bold text-emerald-600">{predictedPts.toFixed(1)}</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-[10px] text-slate-500 uppercase">Selected</div>
            <div className="text-lg font-bold text-purple-700">{selectedBy}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 mt-4">
          <Tabs defaultValue="form" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="form" className="flex-1">
                <Activity className="h-4 w-4 mr-1" />
                Form
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex-1">
                <Target className="h-4 w-4 mr-1" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="fixtures" className="flex-1">
                <Shield className="h-4 w-4 mr-1" />
                Fixtures
              </TabsTrigger>
            </TabsList>

            {/* Form Tab */}
            <TabsContent value="form">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <div className="text-sm text-muted-foreground">Loading history...</div>
                  </div>
                </div>
              ) : error || !historicalData || historicalData.lastFiveGWs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <div className="text-sm text-muted-foreground">
                    {error || 'No recent performance data available'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Last 5 GWs */}
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium">Last 5 Gameweeks</div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon()}
                        <span className="text-xs text-muted-foreground">
                          Avg: {historicalData.avgPoints.toFixed(1)} pts
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {historicalData.lastFiveGWs.map((game, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex-1 px-1.5 py-2 rounded text-center",
                            getPointsColor(game.points)
                          )}
                        >
                          <div className="text-sm font-bold">{game.points}</div>
                          <div className="text-[9px] opacity-90">GW{game.gw}</div>
                          <div className="text-[9px] opacity-75">{game.minutes}&apos;</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* Home vs Away */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Home className="h-3 w-3" />
                        <span>Home Avg</span>
                      </div>
                      <div className="text-xl font-bold text-blue-700">
                        {historicalData.homeAvg.toFixed(1)}
                      </div>
                    </Card>
                    <Card className="p-3 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Plane className="h-3 w-3" />
                        <span>Away Avg</span>
                      </div>
                      <div className="text-xl font-bold text-purple-700">
                        {historicalData.awayAvg.toFixed(1)}
                      </div>
                    </Card>
                  </div>

                  {/* Recent Returns */}
                  <Card className="p-4">
                    <div className="text-sm font-medium mb-3">Recent Returns</div>
                    <div className="space-y-2">
                      {historicalData.lastFiveGWs.map((game, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge className="text-xs bg-slate-100 border-slate-300">GW{game.gw}</Badge>
                            {game.home ? (
                              <Home className="h-3 w-3 text-blue-600" />
                            ) : (
                              <Plane className="h-3 w-3 text-purple-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {game.goals > 0 && <span>⚽ {game.goals}</span>}
                            {game.assists > 0 && <span>🎯 {game.assists}</span>}
                            {game.cleanSheets > 0 && <span>🛡️ CS</span>}
                            {game.bonus > 0 && <span>✨ {game.bonus}</span>}
                            <span className="font-bold text-slate-700">{game.points} pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {/* AI Signals */}
                  {player.expExplain?.signals && player.expExplain.signals.length > 0 && (
                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium">AI Signals</span>
                        {player.expExplain.signalMultiplier != null && (
                          <Badge className={cn(
                            "text-[10px] px-1.5 py-0",
                            player.expExplain.signalMultiplier > 1
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : player.expExplain.signalMultiplier < 1
                              ? "bg-red-100 text-red-700 border-red-300"
                              : "bg-slate-100 text-slate-600 border-slate-300"
                          )}>
                            {player.expExplain.signalMultiplier > 1 ? "+" : ""}
                            {((player.expExplain.signalMultiplier - 1) * 100).toFixed(0)}% adj
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        {player.expExplain.signals.map((sig, idx) => {
                          const iconMap: Record<string, any> = {
                            starts: CheckCircle2, benched: XCircle, injured: AlertTriangle,
                            returning: CheckCircle2, hot_form: Flame, cold_form: Snowflake,
                            rotation_risk: RotateCcw, set_piece_change: Crosshair,
                          };
                          const colorMap: Record<string, string> = {
                            starts: "text-emerald-600", benched: "text-red-600", injured: "text-red-600",
                            returning: "text-blue-600", hot_form: "text-orange-600", cold_form: "text-sky-600",
                            rotation_risk: "text-amber-600", set_piece_change: "text-purple-600",
                          };
                          const SigIcon = iconMap[sig.signal] || AlertTriangle;
                          return (
                            <div key={idx} className="flex items-start gap-2 bg-white/60 rounded-lg p-2">
                              <SigIcon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", colorMap[sig.signal] || "text-slate-500")} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-medium capitalize">{sig.signal.replace(/_/g, ' ')}</span>
                                  <span className={cn("text-[10px] font-bold",
                                    sig.adjustment > 0 ? "text-emerald-600" : sig.adjustment < 0 ? "text-red-600" : "text-slate-500"
                                  )}>
                                    {sig.adjustment > 0 ? "+" : ""}{(sig.adjustment * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{sig.reason}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Stats Tab */}
            <TabsContent value="stats">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <div className="text-sm text-muted-foreground">Loading stats...</div>
                  </div>
                </div>
              ) : !historicalData?.seasonStats ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <div className="text-sm text-muted-foreground">No season stats available</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Season Totals */}
                  <Card className="p-4">
                    <div className="text-sm font-medium mb-3">Season Totals</div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-slate-800">
                          {historicalData.seasonStats.goals}
                        </div>
                        <div className="text-xs text-muted-foreground">Goals</div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-slate-800">
                          {historicalData.seasonStats.assists}
                        </div>
                        <div className="text-xs text-muted-foreground">Assists</div>
                      </div>
                      <div className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-2xl font-bold text-slate-800">
                          {historicalData.seasonStats.cleanSheets}
                        </div>
                        <div className="text-xs text-muted-foreground">Clean Sheets</div>
                      </div>
                    </div>
                  </Card>

                  {/* Additional Stats */}
                  <Card className="p-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Bonus</span>
                        <span className="font-bold">{historicalData.seasonStats.bonus}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Minutes</span>
                        <span className="font-bold">{historicalData.seasonStats.minutes.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Total Points</span>
                        <span className="font-bold text-emerald-600">{historicalData.seasonStats.totalPoints}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Games</span>
                        <span className="font-bold">{historicalData.seasonStats.gamesPlayed}</span>
                      </div>
                    </div>
                  </Card>

                  {/* GK specific stats */}
                  {player.position === "GK" && historicalData.seasonStats.saves > 0 && (
                    <Card className="p-4">
                      <div className="text-sm font-medium mb-3">Goalkeeper Stats</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <span className="text-sm text-muted-foreground">Saves</span>
                          <span className="font-bold text-yellow-700">{historicalData.seasonStats.saves}</span>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Defcon Stats - Only for outfield players */}
                  {canEarnDefcon && (
                    <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="h-4 w-4 text-indigo-600" />
                        <span className="text-sm font-medium">Defcon</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-3 bg-white/60 rounded-lg">
                          <div className="text-2xl font-bold text-indigo-700">
                            {historicalData.defcon?.points || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Points</div>
                        </div>
                        <div className="text-center p-3 bg-white/60 rounded-lg">
                          <div className="text-2xl font-bold text-indigo-700">
                            {historicalData.defcon?.timesEarned || 0}
                          </div>
                          <div className="text-xs text-muted-foreground">Times Earned</div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Cards */}
                  {(historicalData.seasonStats.yellowCards > 0 || historicalData.seasonStats.redCards > 0) && (
                    <Card className="p-4">
                      <div className="text-sm font-medium mb-3">Discipline</div>
                      <div className="flex gap-4">
                        {historicalData.seasonStats.yellowCards > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-5 bg-yellow-400 rounded-sm"></div>
                            <span className="font-bold">{historicalData.seasonStats.yellowCards}</span>
                          </div>
                        )}
                        {historicalData.seasonStats.redCards > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-5 bg-red-500 rounded-sm"></div>
                            <span className="font-bold">{historicalData.seasonStats.redCards}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Fixtures Tab */}
            <TabsContent value="fixtures">
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="text-sm font-medium mb-3">Upcoming Fixtures</div>
                  <div className="space-y-2">
                    {(() => {
                      const fixtures = player.nextFixtures.slice(0, 8);
                      const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
                      for (const fix of fixtures) {
                        const last = groups[groups.length - 1];
                        if (last && fix.event != null && last.event === fix.event) {
                          last.fixtures.push(fix);
                        } else {
                          groups.push({ event: fix.event, fixtures: [fix] });
                        }
                      }
                      return groups.slice(0, 5).map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1">
                          {group.fixtures.map((fixture, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Badge className="text-xs bg-slate-100 border-slate-300">
                                  GW{(fixture.event || (21 + weekOffset + gIdx))}
                                </Badge>
                                {group.fixtures.length >= 2 && fIdx === 0 && (
                                  <Badge className="text-[9px] bg-blue-500 text-white border-blue-600 px-1 py-0">DGW</Badge>
                                )}
                                {fixture.H ? (
                                  <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                                    <Home className="h-3 w-3 mr-1" />
                                    Home
                                  </Badge>
                                ) : (
                                  <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                                    <Plane className="h-3 w-3 mr-1" />
                                    Away
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{fixture.opp}</span>
                                <div className={cn(
                                  "px-2 py-1 rounded text-xs font-bold",
                                  getFdrColor(fixture.diff),
                                  getFdrTextColor(fixture.diff)
                                )}>
                                  FDR {fixture.diff}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </Card>

                {/* Fixture Difficulty Summary - grouped by event */}
                <Card className="p-4">
                  <div className="text-sm font-medium mb-3">Fixture Difficulty</div>
                  <div className="flex gap-1.5">
                    {(() => {
                      const fixtures = player.nextFixtures.slice(0, 8);
                      const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
                      for (const fix of fixtures) {
                        const last = groups[groups.length - 1];
                        if (last && fix.event != null && last.event === fix.event) {
                          last.fixtures.push(fix);
                        } else {
                          groups.push({ event: fix.event, fixtures: [fix] });
                        }
                      }
                      return groups.slice(0, 5).map((group, gIdx) => (
                        <div key={gIdx} className="flex-1 space-y-0.5">
                          {group.fixtures.length >= 2 && (
                            <div className="text-center">
                              <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500 text-white leading-none">DGW</span>
                            </div>
                          )}
                          {group.fixtures.map((fixture, fIdx) => (
                            <div
                              key={fIdx}
                              className={cn(
                                "px-1.5 py-2 rounded text-center",
                                getFdrColor(fixture.diff),
                                getFdrTextColor(fixture.diff)
                              )}
                            >
                              <div className="text-sm font-bold">{fixture.opp}</div>
                              <div className="text-[10px] opacity-90">{fixture.H ? 'H' : 'A'}</div>
                            </div>
                          ))}
                        </div>
                      ));
                    })()}
                  </div>
                </Card>

                {/* Minutes Probability */}
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4" />
                      Minutes Probability
                    </div>
                    <span className="font-bold">{((player.minutesProb || 0) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={cn(
                        "h-3 rounded-full transition-all",
                        (player.minutesProb || 0) >= 0.8 ? "bg-green-500" :
                        (player.minutesProb || 0) >= 0.5 ? "bg-yellow-500" :
                        "bg-red-500"
                      )}
                      style={{ width: `${(player.minutesProb || 0) * 100}%` }}
                    />
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Action buttons */}
        <div className="px-4 mt-4 space-y-3 pb-6">
          <div className="flex gap-3">
            <button
              onClick={handleRemove}
              className="flex-1 py-3 rounded-full border-2 border-red-500 text-red-500 font-semibold text-sm hover:bg-red-50"
            >
              Remove
            </button>
            <button
              onClick={() => {
                if (onSelectReplacement) {
                  onSelectReplacement(player);
                  onOpenChange(false);
                }
              }}
              className="flex-1 py-3 rounded-full bg-purple-700 text-white font-semibold text-sm hover:bg-purple-800"
            >
              Select Replacement
            </button>
          </div>
          <button
            onClick={handleSubstitute}
            className="w-full py-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold text-sm hover:from-blue-600 hover:to-cyan-600 flex items-center justify-center gap-2"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Substitute
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
