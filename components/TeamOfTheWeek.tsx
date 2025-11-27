"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { pickBestXIFromPool, weeklyExp } from "@/lib/optimizer";
import { Player } from "@/lib/data";
import { ChevronLeft, ChevronRight, Trophy, TrendingUp, Users, Star, Crown, Zap, Target, Download, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useSquadStore } from "@/store/squad";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamOfTheWeekProps {
  gwOffset?: number;
}

export function TeamOfTheWeek({ gwOffset = 0 }: TeamOfTheWeekProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDiffDialog, setShowDiffDialog] = useState(false);
  
  const addPlayer = useSquadStore((s) => s.addPlayer);
  const squadPlayers = useSquadStore((s) => [
    ...s.squad.starters.GK,
    ...s.squad.starters.DEF,
    ...s.squad.starters.MID,
    ...s.squad.starters.FWD,
    ...s.squad.bench,
  ]);
  const ownedPlayerIds = useMemo(() => new Set(squadPlayers.map(p => p.id)), [squadPlayers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/players`);
        if (!res.ok) throw new Error("Failed to fetch players");
        const data: Player[] = await res.json();
        if (!cancelled) setPlayers(data);
      } catch (e: any) {
        console.error("Failed to load players", e);
        if (!cancelled) {
          setError(e?.message || "Failed to load players");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const teamOfTheWeek = useMemo(() => {
    if (!players.length) return null;
    return pickBestXIFromPool(players, gwOffset);
  }, [players, gwOffset]);

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-green-100 text-green-800 border-green-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatExpectedPoints = (points: number) => {
    return points.toFixed(1);
  };

  const handleAddPlayer = (player: Player) => {
    const result = addPlayer(player);
    if (result.ok) {
      toast.success(`${player.name} added to your squad!`);
    } else {
      toast.error(result.reason || `Failed to add ${player.name}`);
    }
  };

  // Calculate diff between optimal team and current squad
  const squadDiff = useMemo(() => {
    if (!teamOfTheWeek) return { missing: [], total: 0 };
    const missing = teamOfTheWeek.xi.filter(p => !ownedPlayerIds.has(p.id));
    return { missing, total: teamOfTheWeek.xi.length };
  }, [teamOfTheWeek, ownedPlayerIds]);

  const handleBulkApply = () => {
    if (!squadDiff.missing.length) {
      toast.info("You already own all players from this team!");
      return;
    }
    setShowDiffDialog(true);
  };

  const confirmBulkApply = () => {
    let successCount = 0;
    const failedPlayers: string[] = [];

    squadDiff.missing.forEach(player => {
      const result = addPlayer(player);
      if (result.ok) {
        successCount++;
      } else {
        failedPlayers.push(player.name);
      }
    });

    setShowDiffDialog(false);

    if (successCount > 0) {
      toast.success(`Added ${successCount} player${successCount > 1 ? 's' : ''} to your squad!`);
    }
    if (failedPlayers.length > 0) {
      toast.error(`Failed to add: ${failedPlayers.join(', ')}. Check squad constraints.`);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl border border-emerald-200/60 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Team of the Week
              </div>
              <div className="text-xs text-muted-foreground">Elite XI Selection</div>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <div className="text-sm text-muted-foreground">Analyzing player performances...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !teamOfTheWeek) {
    return (
      <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl border border-emerald-200/60 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Team of the Week
              </div>
              <div className="text-xs text-muted-foreground">Elite XI Selection</div>
            </div>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">⚠️ Unable to load team data</div>
              <div className="text-xs text-red-600">{error || "Please try again later"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-blue-50 to-purple-50 rounded-xl border border-emerald-200/60 shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold">Team of the Week</div>
              <div className="text-sm text-white/80">Elite XI • Highest Expected Returns</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold">{formatExpectedPoints(teamOfTheWeek.points)}</div>
              <div className="text-xs text-white/80">Expected Points</div>
            </div>
            {squadDiff.missing.length > 0 && (
              <Button
                onClick={handleBulkApply}
                className="bg-white text-emerald-600 hover:bg-white/90 shadow-lg font-semibold"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Apply to Squad ({squadDiff.missing.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 bg-white/50 border-b border-white/60">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-emerald-700">£{teamOfTheWeek.xi.reduce((sum, p) => sum + p.price, 0).toFixed(1)}m</div>
              <div className="text-xs text-muted-foreground">Total Value</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-700">{teamOfTheWeek.xi.filter(p => ownedPlayerIds.has(p.id)).length}/{teamOfTheWeek.xi.length}</div>
              <div className="text-xs text-muted-foreground">You Own</div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Display - Fixed scroll */}
      <div className="p-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-300 scrollbar-track-transparent pr-2">
          {teamOfTheWeek.xi.map((player, index) => {
            const isOwned = ownedPlayerIds.has(player.id);
            const isCaptain = player.id === teamOfTheWeek.capId;
            
            return (
              <div 
                key={player.id} 
                className={`relative p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                  isOwned 
                    ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-sm' 
                    : 'bg-white/80 border-gray-200 hover:border-emerald-300 hover:bg-white/90'
                }`}
              >
                {isCaptain && (
                  <div className="absolute top-2 right-2">
                    <div className="p-1 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-sm">
                      <Crown className="h-3 w-3 text-white" />
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex flex-col items-center gap-1">
                      <Badge className={`text-xs font-semibold px-2 py-1 ${getPositionColor(player.position)}`}>
                        {player.position}
                      </Badge>
                      <div className="text-xs text-muted-foreground">#{index + 1}</div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">{player.name}</span>
                        {isOwned && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-300">
                            <Users className="h-3 w-3 mr-1" />
                            Owned
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-medium text-gray-700">{player.team}</span>
                        <span>£{player.price.toFixed(1)}m</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-lg font-bold text-emerald-700">
                        <Zap className="h-4 w-4" />
                        {formatExpectedPoints(weeklyExp(player, gwOffset))}
                      </div>
                      <div className="text-xs text-muted-foreground">Expected Pts</div>
                    </div>
                    
                    {!isOwned && (
                      <Button
                        size="sm"
                        onClick={() => handleAddPlayer(player)}
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white border-0 shadow-sm text-xs px-3 py-2"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Add Player
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="text-xs text-muted-foreground bg-white/60 p-3 rounded-lg border border-white/80">
          💡 <strong>Pro Tip:</strong> This optimal XI is calculated from all Premier League players based on expected points for the selected gameweek. Use "Apply to Squad" to bulk add missing players.
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showDiffDialog} onOpenChange={setShowDiffDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
              Apply Team to Your Squad
            </DialogTitle>
            <DialogDescription>
              Review the players that will be added to your squad. Note: This doesn't remove existing players.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Players to add:</span>
                <Badge className="bg-blue-600 text-white">{squadDiff.missing.length}</Badge>
              </div>
            </div>

            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {squadDiff.missing.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${getPositionColor(player.position)}`}>
                        {player.position}
                      </Badge>
                      <div>
                        <div className="font-medium text-sm">{player.name}</div>
                        <div className="text-xs text-muted-foreground">{player.team} • £{player.price.toFixed(1)}m</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-600">
                        {formatExpectedPoints(weeklyExp(player, gwOffset))} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠️ <strong>Important:</strong> Players will only be added if squad constraints allow (max 3 per club, valid formations, etc.).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowDiffDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmBulkApply}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Add {squadDiff.missing.length} Player{squadDiff.missing.length > 1 ? 's' : ''}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
