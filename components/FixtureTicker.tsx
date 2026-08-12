"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Player, Fixture, getFixturesForWeek } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Home, Plane, TrendingUp, TrendingDown, Minus, Shield, Calendar } from "lucide-react";

interface FixtureTickerProps {
  player: Player;
  numFixtures?: number;
  showFDR?: boolean;
  compact?: boolean;
}

export function FixtureTicker({ 
  player, 
  numFixtures = 8, 
  showFDR = true,
  compact = false 
}: FixtureTickerProps) {
  const fixtures = player.nextFixtures?.slice(0, numFixtures) || [];

  // Calculate FDR (Fixture Difficulty Rating) aggregate
  const fdr = useMemo(() => {
    if (!fixtures.length) return { avg: 0, total: 0, rating: 'N/A' };
    
    const total = fixtures.reduce((sum, fix) => sum + fix.diff, 0);
    const avg = total / fixtures.length;
    
    // Rating based on average
    let rating = 'Medium';
    if (avg <= 2.2) rating = 'Excellent';
    else if (avg <= 2.8) rating = 'Good';
    else if (avg <= 3.5) rating = 'Average';
    else if (avg <= 4.2) rating = 'Difficult';
    else rating = 'Very Hard';

    return { avg, total, rating };
  }, [fixtures]);

  const getDifficultyColor = (diff: number) => {
    if (diff <= 2) return 'bg-emerald-500 text-white border-emerald-600';
    if (diff === 3) return 'bg-yellow-400 text-gray-900 border-yellow-500';
    if (diff === 4) return 'bg-orange-500 text-white border-orange-600';
    return 'bg-red-500 text-white border-red-600';
  };

  const getDifficultyBg = (diff: number) => {
    if (diff <= 2) return 'bg-emerald-50 border-emerald-200';
    if (diff === 3) return 'bg-yellow-50 border-yellow-200';
    if (diff === 4) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getFDRColor = () => {
    if (fdr.avg <= 2.2) return 'text-emerald-600';
    if (fdr.avg <= 2.8) return 'text-green-600';
    if (fdr.avg <= 3.5) return 'text-yellow-600';
    if (fdr.avg <= 4.2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getFDRIcon = () => {
    if (fdr.avg <= 2.8) return <TrendingUp className="h-4 w-4" />;
    if (fdr.avg <= 3.5) return <Minus className="h-4 w-4" />;
    return <TrendingDown className="h-4 w-4" />;
  };

  if (!fixtures.length) {
    return (
      <div className="text-sm text-muted-foreground italic">
        No fixture data available
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {fixtures.map((fix, idx) => (
          <div
            key={idx}
            className={cn(
              "px-2 py-1 rounded text-xs font-medium border",
              getDifficultyColor(fix.diff)
            )}
            title={`${fix.opp} (${fix.H ? 'Home' : 'Away'}) - Difficulty: ${fix.diff}/5`}
          >
            {fix.opp}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* FDR Summary */}
      {showFDR && (
        <div className="flex items-center justify-between p-3 bg-surface-1 rounded-lg border border-surface-border">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            <div>
              <div className="text-xs text-muted-foreground">FDR Rating</div>
              <div className={cn("font-bold text-sm", getFDRColor())}>
                {fdr.rating}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Average</div>
              <div className={cn("font-bold", getFDRColor())}>
                {fdr.avg.toFixed(1)}/5.0
              </div>
            </div>
            <div className={getFDRColor()}>
              {getFDRIcon()}
            </div>
          </div>
        </div>
      )}

      {/* Fixture Ticker - grouped by gameweek */}
      <div className="space-y-2">
        {(() => {
          // Group fixtures by event number for DGW display
          const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
          for (const fix of fixtures) {
            const last = groups[groups.length - 1];
            if (last && fix.event != null && last.event === fix.event) {
              last.fixtures.push(fix);
            } else {
              groups.push({ event: fix.event, fixtures: [fix] });
            }
          }
          return groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1">
              {group.fixtures.map((fix, fIdx) => (
                <div
                  key={fIdx}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md",
                    getDifficultyBg(fix.diff)
                  )}
                >
                  {/* GW Number + DGW badge */}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {fix.event ? `GW${fix.event}` : `GW+${gIdx + 1}`}
                    </span>
                    {group.fixtures.length >= 2 && fIdx === 0 && (
                      <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-blue-500 text-white leading-none">DGW</span>
                    )}
                  </div>

                  {/* Home/Away Icon */}
                  <div className={cn(
                    "p-1.5 rounded",
                    fix.H ? "bg-blue-100 text-blue-700" : "bg-violet-500/10 text-violet-400"
                  )}>
                    {fix.H ? (
                      <Home className="h-3 w-3" />
                    ) : (
                      <Plane className="h-3 w-3" />
                    )}
                  </div>

                  {/* Opponent */}
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{fix.opp}</div>
                    <div className="text-xs text-muted-foreground">
                      {fix.H ? 'Home' : 'Away'}
                    </div>
                  </div>

                  {/* Difficulty Badge */}
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">Diff</div>
                    <Badge className={cn("font-bold min-w-[2rem] justify-center", getDifficultyColor(fix.diff))}>
                      {fix.diff}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span>Easy (1-2)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-400" />
          <span>Medium (3)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-orange-500" />
          <span>Hard (4)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Very Hard (5)</span>
        </div>
      </div>
    </div>
  );
}

// Horizontal scrolling version for dashboard/overview
export function FixtureTickerHorizontal({ 
  player, 
  numFixtures = 8 
}: Omit<FixtureTickerProps, 'showFDR' | 'compact'>) {
  const fixtures = player.nextFixtures?.slice(0, numFixtures) || [];

  const getDifficultyColor = (diff: number) => {
    if (diff <= 2) return 'bg-emerald-500 text-white';
    if (diff === 3) return 'bg-yellow-400 text-gray-900';
    if (diff === 4) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  if (!fixtures.length) {
    return <div className="text-xs text-muted-foreground italic">No fixtures</div>;
  }

  // Group fixtures by event for DGW display
  const groups: { event: number | undefined; fixtures: Fixture[] }[] = [];
  for (const fix of fixtures) {
    const last = groups[groups.length - 1];
    if (last && fix.event != null && last.event === fix.event) {
      last.fixtures.push(fix);
    } else {
      groups.push({ event: fix.event, fixtures: [fix] });
    }
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300">
      {groups.map((group, gIdx) => (
        <div
          key={gIdx}
          className={cn(
            "flex-shrink-0 px-2 py-1.5 rounded-lg text-center",
            group.fixtures.length >= 2 ? "min-w-[90px] border-2 border-blue-400" : "min-w-[50px]",
            getDifficultyColor(Math.round(group.fixtures.reduce((s, f) => s + f.diff, 0) / group.fixtures.length))
          )}
          title={group.fixtures.map(f => `${f.opp} (${f.H ? 'Home' : 'Away'}) - Difficulty: ${f.diff}/5`).join(' | ')}
        >
          <div className="text-xs font-bold">
            {group.fixtures.map(f => f.opp).join(', ')}
          </div>
          <div className="text-[10px] opacity-90 flex items-center justify-center gap-0.5">
            {group.fixtures.length >= 2 ? (
              <span className="text-[9px] font-bold">DGW{group.event || ''}</span>
            ) : (
              <>
                {group.fixtures[0].H ? <Home className="h-2 w-2" /> : <Plane className="h-2 w-2" />}
                <span className="text-[9px]">{group.event ? `GW${group.event}` : gIdx + 1}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
