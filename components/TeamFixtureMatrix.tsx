"use client";

import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Shield, TrendingUp, TrendingDown, Home, Plane } from "lucide-react";

interface TeamFixtureData {
  team: string;
  fixtures: Array<{
    gw: number;
    opponent: string;
    home: boolean;
    difficulty: number;
  }>;
  fdrAvg: number;
  fdrRating: string;
}

export function TeamFixtureMatrix() {
  const [teamFixtures, setTeamFixtures] = useState<TeamFixtureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/fixtures');
        if (!res.ok) throw new Error('Failed to fetch fixtures');
        
        const data = await res.json();
        if (!cancelled) {
          // Sort by FDR (easiest first)
          const sortedTeams = data.teams.sort((a: TeamFixtureData, b: TeamFixtureData) => 
            a.fdrAvg - b.fdrAvg
          );
          setTeamFixtures(sortedTeams);
        }
      } catch (e: any) {
        console.error('Failed to load fixtures', e);
        if (!cancelled) {
          setError(e?.message || 'Failed to load fixtures');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const getDifficultyColor = (diff: number) => {
    if (diff <= 2) return 'bg-emerald-500';
    if (diff === 3) return 'bg-yellow-400';
    if (diff === 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getFDRColor = (avg: number) => {
    if (avg <= 2.2) return 'text-emerald-600';
    if (avg <= 2.8) return 'text-green-600';
    if (avg <= 3.5) return 'text-yellow-600';
    if (avg <= 4.2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getFDRBg = (avg: number) => {
    if (avg <= 2.2) return 'bg-emerald-50 border-emerald-200';
    if (avg <= 2.8) return 'bg-green-50 border-green-200';
    if (avg <= 3.5) return 'bg-yellow-50 border-yellow-200';
    if (avg <= 4.2) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <Card className="p-12">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-sm text-muted-foreground">Loading fixtures from 2025/26 season...</div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Failed to load fixtures</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-bold">Team Fixture Difficulty Matrix</h3>
        </div>
        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
          Next 8 Gameweeks • 2025/26 Season
        </Badge>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>1-2: Easy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span>3: Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>4: Hard</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>5: Very Hard</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Home className="h-3 w-3" />
          <span>Home</span>
          <span className="mx-1">•</span>
          <Plane className="h-3 w-3" />
          <span>Away</span>
        </div>
      </div>

      {/* Matrix */}
      <Card className="overflow-hidden">
        <ScrollArea className="h-[600px]">
          <div className="p-4 space-y-2">
            {teamFixtures.map((teamData) => (
              <div
                key={teamData.team}
                className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-all bg-white"
              >
                {/* Team */}
                <div className="w-16 flex-shrink-0">
                  <div className="font-bold text-sm">{teamData.team}</div>
                  <div className={cn("text-xs font-medium", getFDRColor(teamData.fdrAvg))}>
                    {teamData.fdrAvg.toFixed(1)}
                  </div>
                </div>

                {/* FDR Rating */}
                <div className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium flex-shrink-0",
                  getFDRBg(teamData.fdrAvg)
                )}>
                  <span className={getFDRColor(teamData.fdrAvg)}>
                    {teamData.fdrRating}
                  </span>
                </div>

                {/* Fixtures */}
                <div className="flex gap-1 flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300">
                  {teamData.fixtures.map((fix, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "flex-shrink-0 w-14 p-1.5 rounded text-center text-white text-xs font-medium",
                        getDifficultyColor(fix.difficulty)
                      )}
                      title={`GW${fix.gw}: ${fix.opponent} (${fix.home ? 'H' : 'A'}) - Diff: ${fix.difficulty}`}
                    >
                      <div className="font-bold text-xs">{fix.opponent}</div>
                      <div className="flex items-center justify-center gap-0.5 text-[9px] opacity-90">
                        {fix.home ? <Home className="h-2 w-2" /> : <Plane className="h-2 w-2" />}
                        <span>{fix.gw}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Trend */}
                <div className={cn("flex-shrink-0", getFDRColor(teamData.fdrAvg))}>
                  {teamData.fdrAvg <= 2.8 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="text-xs text-muted-foreground mb-1">Easiest Fixtures</div>
          <div className="text-lg font-bold text-emerald-700">
            {teamFixtures.filter(t => t.fdrAvg <= 2.8).length} teams
          </div>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="text-xs text-muted-foreground mb-1">Average Fixtures</div>
          <div className="text-lg font-bold text-yellow-700">
            {teamFixtures.filter(t => t.fdrAvg > 2.8 && t.fdrAvg <= 3.5).length} teams
          </div>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-xs text-muted-foreground mb-1">Difficult Fixtures</div>
          <div className="text-lg font-bold text-red-700">
            {teamFixtures.filter(t => t.fdrAvg > 3.5).length} teams
          </div>
        </Card>
      </div>
    </div>
  );
}
