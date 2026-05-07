"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player } from "@/lib/data";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3,
  Home,
  Plane,
  Target,
  Activity,
  Award
} from "lucide-react";

interface PlayerPerformanceHistoryProps {
  player: Player;
  compact?: boolean;
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
  }>;
  avgPoints: number;
  homeAvg: number;
  awayAvg: number;
  totalPoints: number;
  trend: 'up' | 'down' | 'stable';
  homeGamesCount?: number;
  awayGamesCount?: number;
}

export function PlayerPerformanceHistory({ 
  player, 
  compact = false 
}: PlayerPerformanceHistoryProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
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
  }, [player.id]);

  const getPointsColor = (points: number) => {
    if (points >= 10) return 'bg-emerald-500 text-white';
    if (points >= 6) return 'bg-green-500 text-white';
    if (points >= 3) return 'bg-yellow-400 text-gray-900';
    if (points >= 1) return 'bg-orange-400 text-white';
    return 'bg-red-400 text-white';
  };

  const getPointsBg = (points: number) => {
    if (points >= 10) return 'bg-emerald-50 border-emerald-200';
    if (points >= 6) return 'bg-green-50 border-green-200';
    if (points >= 3) return 'bg-yellow-50 border-yellow-200';
    return 'bg-gray-50 border-gray-200';
  };

  const getTrendIcon = () => {
    if (!historicalData) return <Minus className="h-4 w-4 text-gray-600" />;
    if (historicalData.trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (historicalData.trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <div className="text-sm text-muted-foreground">Loading performance history...</div>
        </div>
      </div>
    );
  }

  if (error || !historicalData || historicalData.lastFiveGWs.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <div className="text-sm text-muted-foreground">
          {error || 'No recent performance data available'}
        </div>
      </div>
    );
  }

  // Safe to access historicalData here after null checks
  const maxPoints = Math.max(...historicalData.lastFiveGWs.map(g => g.points), 10);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Activity className="h-3 w-3" />
          <span>Last 5 GWs</span>
        </div>
        <div className="flex gap-1">
          {historicalData.lastFiveGWs.map((game, idx) => (
            <div
              key={idx}
              className={cn(
                "flex-1 px-2 py-2 rounded text-center",
                getPointsColor(game.points)
              )}
              title={`GW${game.gw}: ${game.points} pts • ${game.minutes} mins`}
            >
              <div className="text-sm font-bold">{game.points}</div>
              <div className="text-[10px] opacity-90">GW{game.gw}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Avg: {historicalData.avgPoints.toFixed(1)}</span>
          {getTrendIcon()}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="font-bold">Performance History</h3>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon()}
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            Last 5 GWs
          </Badge>
        </div>
      </div>

      {/* Points Bar Chart */}
      <Card className="p-4">
        <div className="mb-3">
          <div className="text-sm font-medium mb-1">Points per Gameweek</div>
          <div className="text-xs text-muted-foreground">Visual breakdown of recent performance</div>
        </div>
        <div className="space-y-2">
          {historicalData.lastFiveGWs.map((game, idx) => (
            <div key={idx} className={cn("p-3 rounded-lg border", getPointsBg(game.points))}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">GW{game.gw}</span>
                  {game.home ? (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
                      <Home className="h-2 w-2 mr-1" />
                      Home
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
                      <Plane className="h-2 w-2 mr-1" />
                      Away
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{game.minutes} mins</span>
                  <span className={cn("font-bold text-lg", 
                    game.points >= 10 ? "text-emerald-600" :
                    game.points >= 6 ? "text-green-600" :
                    game.points >= 3 ? "text-yellow-600" :
                    "text-gray-600"
                  )}>
                    {game.points} pts
                  </span>
                </div>
              </div>
              
              {/* Bar */}
              <div className="relative">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all",
                      game.points >= 10 ? "bg-emerald-500" :
                      game.points >= 6 ? "bg-green-500" :
                      game.points >= 3 ? "bg-yellow-400" :
                      "bg-gray-400"
                    )}
                    style={{ width: `${(game.points / maxPoints) * 100}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              {(game.goals > 0 || game.assists > 0 || game.bonus > 0) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {game.goals > 0 && <span>⚽ {game.goals}G</span>}
                  {game.assists > 0 && <span>🎯 {game.assists}A</span>}
                  {game.bonus > 0 && <span>✨ {game.bonus}B</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Target className="h-3 w-3" />
            <span>Average</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">
            {historicalData.avgPoints.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">pts/game</div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Home className="h-3 w-3" />
            <span>Home Avg</span>
          </div>
          <div className="text-2xl font-bold text-green-700">
            {historicalData.homeAvg.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {historicalData.lastFiveGWs.filter(g => g.home).length} games
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Plane className="h-3 w-3" />
            <span>Away Avg</span>
          </div>
          <div className="text-2xl font-bold text-purple-700">
            {historicalData.awayAvg.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {historicalData.lastFiveGWs.filter(g => !g.home).length} games
          </div>
        </Card>
      </div>

      {/* Home/Away Comparison */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-600" />
          <div className="text-sm font-medium">Home vs Away Performance</div>
        </div>
        <div className="space-y-3">
          {/* Home */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Home className="h-3 w-3" />
                Home
              </span>
              <span className="font-medium">{historicalData.homeAvg.toFixed(1)} pts/game</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${Math.min((historicalData.homeAvg / 15) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Away */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Plane className="h-3 w-3" />
                Away
              </span>
              <span className="font-medium">{historicalData.awayAvg.toFixed(1)} pts/game</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${Math.min((historicalData.awayAvg / 15) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Difference */}
          {historicalData.homeAvg !== historicalData.awayAvg && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <span className="font-medium">
                {historicalData.homeAvg > historicalData.awayAvg 
                  ? "🏠 Better at home" 
                  : "✈️ Better away"}
              </span>
              <span className="text-muted-foreground ml-2">
                (+{Math.abs(historicalData.homeAvg - historicalData.awayAvg).toFixed(1)} pts)
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
