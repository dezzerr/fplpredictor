"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Player } from "@/lib/data";
import { weeklyExp } from "@/lib/optimizer";
import { PlayerPerformanceHistory } from "@/components/PlayerPerformanceHistory";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  X,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
  Zap,
  Shield,
  DollarSign,
  Users,
  Activity,
  Target,
  Clock,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 3;

export function PlayerComparison() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSearch, setShowSearch] = useState(true);
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState<Player | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/players");
        if (!res.ok) throw new Error("Failed to fetch");
        const data: Player[] = await res.json();
        if (!cancelled) setPlayers(data);
      } catch (e) {
        console.error("Failed to load players", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredPlayers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return players.slice(0, 50);
    return players
      .filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.team.toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [searchQuery, players]);

  const addPlayer = (player: Player) => {
    if (selectedPlayers.length >= MAX_COMPARE) return;
    if (selectedPlayers.find(p => p.id === player.id)) return;
    setSelectedPlayers([...selectedPlayers, player]);
    setSearchQuery("");
    if (selectedPlayers.length + 1 >= MAX_COMPARE) {
      setShowSearch(false);
    }
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
    setShowSearch(true);
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-green-100 text-green-800 border-green-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusColor = (status: Player["status"]) => {
    switch (status) {
      case 'fit': return 'text-green-600';
      case 'flag': return 'text-amber-600';
      case 'out': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: Player["status"]) => {
    switch (status) {
      case 'fit': return '✓';
      case 'flag': return '⚠';
      case 'out': return '✗';
      default: return '?';
    }
  };

  // Calculate comparison metrics
  const getComparisonMetrics = (player: Player) => {
    const next5GWs = Array.from({ length: 5 }, (_, i) => weeklyExp(player, i));
    const avgNext5 = next5GWs.reduce((a, b) => a + b, 0) / 5;
    
    return {
      next5GWs,
      avgNext5,
      pricePerPoint: player.expPoints > 0 ? player.price / player.expPoints : 0,
      ownershipPerc: player.ownership || 0,
    };
  };

  const getBestValue = (metric: 'price' | 'expPoints' | 'avgNext5' | 'pricePerPoint') => {
    if (selectedPlayers.length === 0) return null;
    
    const values = selectedPlayers.map(p => {
      const metrics = getComparisonMetrics(p);
      switch (metric) {
        case 'price': return { player: p, value: p.price };
        case 'expPoints': return { player: p, value: p.expPoints };
        case 'avgNext5': return { player: p, value: metrics.avgNext5 };
        case 'pricePerPoint': return { player: p, value: metrics.pricePerPoint };
      }
    });

    // For price and pricePerPoint, lower is better
    if (metric === 'price' || metric === 'pricePerPoint') {
      return values.reduce((min, curr) => curr.value < min.value ? curr : min).player.id;
    }
    // For others, higher is better
    return values.reduce((max, curr) => curr.value > max.value ? curr : max).player.id;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
            <div className="text-sm text-muted-foreground">Loading players...</div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Player Comparison
                </h2>
                <p className="text-sm text-muted-foreground">
                  Compare up to {MAX_COMPARE} players side-by-side
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge className="text-xs border">
              {selectedPlayers.length}/{MAX_COMPARE} selected
            </Badge>
          </div>
        </div>
      </div>

      {/* Search Section */}
      {showSearch && selectedPlayers.length < MAX_COMPARE && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players by name or team..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {searchQuery && (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.find(p => p.id === player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => !isSelected && addPlayer(player)}
                      disabled={!!isSelected}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        isSelected 
                          ? "bg-gray-100 cursor-not-allowed opacity-50" 
                          : "hover:border-blue-300 hover:bg-blue-50 cursor-pointer"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className={cn("text-xs", getPositionColor(player.position))}>
                            {player.position}
                          </Badge>
                          <div>
                            <div className="font-medium">{player.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {player.team} • £{player.price.toFixed(1)}m • {player.expPoints?.toFixed(1)} pts
                            </div>
                          </div>
                        </div>
                        {!isSelected && <ArrowRight className="h-4 w-4 text-blue-600" />}
                      </div>
                    </button>
                  );
                })}
                {filteredPlayers.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No players found
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </Card>
      )}

      {/* Comparison Grid */}
      {selectedPlayers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedPlayers.map((player) => {
            const metrics = getComparisonMetrics(player);
            const isBestPrice = getBestValue('price') === player.id;
            const isBestEP = getBestValue('expPoints') === player.id;
            const isBestAvg = getBestValue('avgNext5') === player.id;
            const isBestValue = getBestValue('pricePerPoint') === player.id;

            return (
              <Card key={player.id} className="relative overflow-hidden">
                {/* Remove button */}
                <button
                  onClick={() => removePlayer(player.id)}
                  className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-red-50 rounded-full shadow-sm z-10 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-600 hover:text-red-600" />
                </button>

                {/* Player Header */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                  <div className="flex items-start gap-3 mb-2">
                    <Badge className={cn("text-xs", getPositionColor(player.position))}>
                      {player.position}
                    </Badge>
                    <div className="flex-1">
                      <div className="font-bold text-lg">{player.name}</div>
                      <div className="text-sm text-white/80">{player.team}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={getStatusColor(player.status)}>
                      {getStatusIcon(player.status)} {player.status}
                    </span>
                    {(() => {
                      const ex: any = player.expExplain as any;
                      const raw: string | undefined = ex?.rawStatus;
                      if (!raw || raw === 'a') return null;
                      const chance: number | undefined = ex?.chance;
                      const news: string | undefined = ex?.news;
                      const label = raw === 'i' ? 'Inj' : raw === 's' ? 'Sus' : raw === 'd' ? 'Doubt' : raw === 'n' ? 'N/A' : 'Flag';
                      const color = raw === 'i'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : raw === 's'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300';
                      return (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Badge className={cn('border', color)}>
                                  {label}{typeof chance === 'number' ? ` ${chance}%` : ''}
                                </Badge>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs">
                              {news || 'Status update'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })()}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="p-4 space-y-3">
                  {/* Price & EP */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      "p-3 rounded-lg border",
                      isBestPrice ? "bg-green-50 border-green-300" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        Price
                      </div>
                      <div className="text-lg font-bold">£{player.price.toFixed(1)}m</div>
                      {isBestPrice && <div className="text-xs text-green-600 font-medium">Cheapest</div>}
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg border",
                      isBestEP ? "bg-green-50 border-green-300" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Zap className="h-3 w-3" />
                        Next GW
                      </div>
                      <div className="text-lg font-bold">{player.expPoints?.toFixed(1)}</div>
                      {isBestEP && <div className="text-xs text-green-600 font-medium">Highest</div>}
                    </div>
                  </div>

                  {/* Form & Ownership */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Activity className="h-3 w-3" />
                        Form
                      </div>
                      <div className="text-lg font-bold">{player.form?.toFixed(1) || '0.0'}</div>
                    </div>
                    <div className="p-3 rounded-lg border bg-gray-50">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Users className="h-3 w-3" />
                        Owned
                      </div>
                      <div className="text-lg font-bold">{metrics.ownershipPerc.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Value Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className={cn(
                      "p-3 rounded-lg border",
                      isBestAvg ? "bg-green-50 border-green-300" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <TrendingUp className="h-3 w-3" />
                        Avg (5 GW)
                      </div>
                      <div className="text-lg font-bold">{metrics.avgNext5.toFixed(1)}</div>
                      {isBestAvg && <div className="text-xs text-green-600 font-medium">Best</div>}
                    </div>
                    <div className={cn(
                      "p-3 rounded-lg border",
                      isBestValue ? "bg-green-50 border-green-300" : "bg-gray-50"
                    )}>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Target className="h-3 w-3" />
                        £/Point
                      </div>
                      <div className="text-lg font-bold">{metrics.pricePerPoint.toFixed(2)}</div>
                      {isBestValue && <div className="text-xs text-green-600 font-medium">Best Value</div>}
                    </div>
                  </div>

                  {/* Minutes Probability */}
                  <div className="p-3 rounded-lg border bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Minutes Prob
                      </div>
                      <div className="text-sm font-bold">{((player.minutesProb || 0) * 100).toFixed(0)}%</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(player.minutesProb || 0) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Fixtures */}
                  <div>
                    <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Next 5 Fixtures
                    </div>
                    <div className="flex gap-1">
                      {player.nextFixtures?.slice(0, 5).map((fix, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex-1 p-2 rounded text-center text-xs font-medium border",
                            fix.diff <= 2 ? "bg-green-50 text-green-700 border-green-200" :
                            fix.diff === 3 ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          <div className="font-bold">{fix.opp}</div>
                          <div className="text-[10px] opacity-75">{fix.H ? 'H' : 'A'}</div>
                        </div>
                      )) || <div className="text-xs text-muted-foreground">No fixtures</div>}
                    </div>
                  </div>

                  {/* View History Button */}
                  <Button
                    onClick={() => setSelectedPlayerForHistory(player)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Performance History
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <div className="text-lg font-medium text-gray-900 mb-2">No Players Selected</div>
            <div className="text-sm text-muted-foreground mb-4">
              Search and select up to {MAX_COMPARE} players to compare their stats, fixtures, and value
            </div>
            <Button onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4 mr-2" />
              Start Comparing
            </Button>
          </div>
        </Card>
      )}

      {/* Performance History Dialog */}
      <Dialog open={!!selectedPlayerForHistory} onOpenChange={() => setSelectedPlayerForHistory(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {selectedPlayerForHistory?.name} - Performance History
            </DialogTitle>
          </DialogHeader>
          {selectedPlayerForHistory && (
            <PlayerPerformanceHistory player={selectedPlayerForHistory} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
