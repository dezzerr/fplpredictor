"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useSquadStore } from "@/store/squad";
import { pickXIForWeek, weeklyExp } from "@/lib/optimizer";
import { ChevronLeft, ChevronRight, Zap, Users, Star, Crown, Target, Settings, TrendingUp, Award } from "lucide-react";

interface AutoTeamOptimizerProps {
  gwOffset?: number;
}

export function AutoTeamOptimizer({ gwOffset = 0 }: AutoTeamOptimizerProps) {
  const squad = useSquadStore((s) => s.squad);
  const makeCaptain = useSquadStore((s) => s.makeCaptain);
  
  const optimizedTeam = useMemo(() => {
    return pickXIForWeek(squad, gwOffset);
  }, [squad, gwOffset]);

  const applyOptimalTeam = () => {
    if (optimizedTeam.capId) {
      makeCaptain(optimizedTeam.capId);
    }
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

  const formatExpectedPoints = (points: number) => {
    return points.toFixed(1);
  };

  return (
    <div className="bg-gradient-to-br from-violet-50 via-cyan-50 to-emerald-50 rounded-xl border border-violet-200/60 shadow-lg overflow-hidden">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-violet-600 via-cyan-600 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold">Auto Team Optimizer</div>
              <div className="text-sm text-white/80">Smart XI Selection • Your Squad</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{formatExpectedPoints(optimizedTeam.points)}</div>
            <div className="text-xs text-white/80">Expected Points</div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-4 bg-white/50 border-b border-white/60">
        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-violet-700">{optimizedTeam.xi.length}</div>
              <div className="text-xs text-muted-foreground">Starting XI</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-cyan-700">{optimizedTeam.bench.length}</div>
              <div className="text-xs text-muted-foreground">Bench</div>
            </div>
          </div>
        </div>
      </div>

      {/* Captain Recommendation */}
      {optimizedTeam.capId && (
        <div className="px-6 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
                <Crown className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-semibold text-amber-800">Recommended Captain</div>
                <div className="text-sm text-amber-700">
                  {optimizedTeam.xi.find(p => p.id === optimizedTeam.capId)?.name}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-amber-700">
                {formatExpectedPoints(weeklyExp(optimizedTeam.xi.find(p => p.id === optimizedTeam.capId)!, gwOffset))}
              </div>
              <div className="text-xs text-amber-600">Expected Points</div>
            </div>
          </div>
        </div>
      )}

      {/* Starting XI */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-violet-500 to-cyan-500 rounded-lg shadow-sm">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-gray-800">Starting XI</div>
        </div>
        
        <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-violet-300 scrollbar-track-transparent pr-2">
          {optimizedTeam.xi.map((player, index) => {
            const isCaptain = player.id === optimizedTeam.capId;
            
            return (
              <div 
                key={player.id} 
                className="relative p-4 rounded-xl border bg-white/80 border-gray-200 hover:border-violet-300 hover:bg-white/90 transition-all duration-200 hover:shadow-md"
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
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="font-medium text-gray-700">{player.team}</span>
                        <span>£{player.price.toFixed(1)}m</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-center flex-shrink-0">
                    <div className="flex items-center gap-1 text-lg font-bold text-violet-700">
                      <Zap className="h-4 w-4" />
                      {formatExpectedPoints(weeklyExp(player, gwOffset))}
                    </div>
                    <div className="text-xs text-muted-foreground">Expected Pts</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bench */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-gray-400 to-gray-500 rounded-lg shadow-sm">
            <Award className="h-4 w-4 text-white" />
          </div>
          <div className="font-semibold text-gray-800">Bench</div>
        </div>
        
        <div className="space-y-2">
          {optimizedTeam.bench.map((player, index) => (
            <div 
              key={player.id} 
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50/80 border border-gray-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge className="text-xs bg-gray-100 text-gray-700 border-gray-300">
                    {player.position}
                  </Badge>
                  <div className="text-xs text-muted-foreground">#{index + 1}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 truncate">{player.name}</span>
                  <div className="text-xs text-muted-foreground">
                    {player.team} • £{player.price.toFixed(1)}m
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-gray-600 flex-shrink-0">
                {formatExpectedPoints(weeklyExp(player, gwOffset))} pts
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <div className="px-6 pb-6">
        <Button 
          onClick={applyOptimalTeam} 
          className="w-full bg-gradient-to-r from-violet-500 to-cyan-500 hover:from-violet-600 hover:to-cyan-600 text-white border-0 shadow-lg h-12 text-base font-semibold"
          disabled={!optimizedTeam.capId}
        >
          <TrendingUp className="mr-2 h-5 w-5" />
          Apply Optimal Captain
        </Button>
        
        <div className="text-xs text-muted-foreground bg-white/60 p-3 rounded-lg border border-white/80 mt-4">
          💡 <strong>Smart Optimization:</strong> This automatically selects your highest scoring XI from your current squad and recommends the best captain choice.
        </div>
      </div>
    </div>
  );
}
